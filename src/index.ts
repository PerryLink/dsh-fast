/**
 * `dsh-fast` — read-only performance diagnostics for DeepSeek Harness. Folds
 * the `session/event` stream into session-load timing, spill-hit counts,
 * compaction count and trigger, context-injection volume (AGENTS.md / skill
 * directory / tool schema / surface token share), and LLM cache hit rate;
 * surfaces them via the `/fast` slash command and the `fast_report` tool; and
 * persists them to the harness storage domain on an async sampling timer
 * (never on the append hot path).
 *
 * Function plugin — no default export (the Loader unwraps
 * `exports.default ?? exports`, and a stray default would discard
 * `name`/`inject`/`Config`/`apply`).
 * @module dsh-fast
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
// Type-only: registers the `ctx.commands` Context merge for the inject, plus the
// command definition/invocation faces the registration below is typed against.
import type { CommandDefinition, CommandInvocation } from '@deepseek-ai/dsh-commands'
import { Config, resolveConfig } from './config.ts'
import { FastCollector } from './collector.ts'
import type { MeasureFn, TokenMeasurement } from './collector.ts'
import type { SystemSection } from './estimate.ts'
import { buildReport, renderFastText } from './analyze.ts'
import type { FastReport, FastSnapshot } from './model.ts'
import { fastDomainSpec, appendSample } from './store.ts'
import { createOnceNotifier } from './notices.ts'
import { VERSION } from './version.ts'

export const name = 'fast'
/** The `/fast` command, the `fast_report` tool, and the durable metric domain. */
export const inject = ['commands', 'tools', 'storageDomain']

export { Config, resolveConfig } from './config.ts'
export type { Config as FastConfig, ResolvedConfig } from './config.ts'
export { VERSION } from './version.ts'
export { stripControl, truncate, sanitizeText, sanitizePath } from './sanitize.ts'
export type {
  FastReport,
  FastSnapshot,
  LoadStats,
  SpillStats,
  CompactionStats,
  ContextStats,
  CacheStats,
  StoredSample,
  PromptBucket,
  SystemPromptBreakdown,
} from './model.ts'
export { FastCollector, detectSpilledResult, flattenToolResultText, sharesOf, hitRateOf } from './collector.ts'
export { classifySystemSections, type SystemSection } from './estimate.ts'
export { buildReport, buildSuggestions, renderFastText } from './analyze.ts'
export { fastDomainSpec, appendSample, historySchema } from './store.ts'

// Service Definition — the structural surfaces of the optional tokenMeter and
// systemPrompt services, plus the fast_report tool schema defined inline below.
/** The structural surface of the optional `ctx.tokenMeter` service. */
interface TokenMeterService {
  measure(session: Session): TokenMeasurement
}

/** The structural surface of the optional `ctx.systemPrompt` service (section assembly). */
interface SystemPromptService {
  assemble(): Promise<{ sections: readonly { name: string; text: string }[] }>
}

/** The structural surface of the optional `ctx.sessionQuery` service. */
interface SessionQueryService {
  readSurface(sessionId: Session['id']): Promise<{ readonly events: readonly SessionEvent[] }>
}

/**
 * Structural face of the optional (experimental) `inspector` service. Read
 * structurally on purpose: the service must never be injected, and it is an
 * extra outlet beside the report surfaces — never the only one, so a host
 * without it keeps every metric available through `/fast` and `fast_report`.
 */
interface InspectorLike {
  publish(topic: string, payload: unknown, monotonicMs?: number): void
}

/**
 * Mount the diagnostics. The resolved config is validated first (fail loud);
 * with `enabled: false` the plugin registers nothing and stays inert.
 * @param ctx - the plugin context (host).
 * @param config - raw plugin config.
 */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const resolved = resolveConfig(config)
  const logger = ctx.logger('fast')
  if (!resolved.enabled) {
    logger.info('disabled: enabled is false — no diagnostics are collected')
    return
  }

  const collector = new FastCollector(resolved)
  const domain = await ctx.storageDomain.open(fastDomainSpec)
  // Disposal during the open await: the fiber is gone, so no effect may be
  // registered any more — release the freshly opened handle instead of leaking
  // it (the storage facility is single-open per name, so an unreleased handle
  // also blocks a later remount).
  if (ctx.fiber.uid === null) {
    await domain.close()
    return
  }
  const sessions = domain.table('sessions')

  /**
   * One-time visible degradation notices: a subsystem fallback that used to be
   * silent now says so once per process, so a report built from heuristics is
   * never mistaken for a measured one.
   */
  const warnFallbackOnce = createOnceNotifier(message => logger.warn(message))

  /** The optional metrics outlet; a no-op when the service is absent or throws. */
  const inspector = ctx.get('inspector') as unknown as InspectorLike | undefined
  const publishSnapshot = (session: Session, snapshot: FastSnapshot): void => {
    if (inspector === undefined || typeof inspector.publish !== 'function') return
    try {
      inspector.publish('dsh-fast/snapshot', { sessionId: session.id, snapshot })
    } catch (error) {
      warnFallbackOnce(
        'inspector',
        `inspector metric outlet failed, continuing with the report surfaces only: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // Consumer — the report paths use the optional tokenMeter/systemPrompt
  // services at call time; the /fast handler and the fast_report execute turn
  // the measurements into the model-visible report.
  /** Lazy, contained lookup of the optional token meter. */
  const measure: MeasureFn = (session) => {
    const meter = ctx.get('tokenMeter') as unknown as TokenMeterService | undefined
    if (meter === undefined) {
      warnFallbackOnce(
        'tokenMeter',
        'tokenMeter is not composed: total/surface tokens fall back to the fixed-density heuristic (spill and compaction counters stay exact)',
      )
      return undefined
    }
    try {
      const measurement = meter.measure(session)
      return { totalTokens: measurement.totalTokens, surfaceTokens: measurement.surfaceTokens }
    } catch (error) {
      logger.warn(`token meter measurement failed: ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }

  /** Assemble the named system-prompt sections for the per-section breakdown. */
  const assembleSections = async (): Promise<readonly SystemSection[] | undefined> => {
    const systemPrompt = ctx.get('systemPrompt') as unknown as SystemPromptService | undefined
    if (systemPrompt === undefined) {
      warnFallbackOnce(
        'systemPrompt',
        'systemPrompt is not composed: the whole rendered prompt is attributed to the "other" bucket instead of the per-section breakdown',
      )
      return undefined
    }
    try {
      const assembly = await systemPrompt.assemble()
      return assembly.sections.map(section => ({ name: section.name, text: section.text }))
    } catch (error) {
      logger.warn(`system-prompt section assembly failed: ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }

  /**
   * Read the current surface events for one session through the optional
   * `sessionQuery` service. This replaces the deprecated synchronous
   * `Session.eventAt(seq)` read; a host that composes no `sessionQuery` leaves
   * the collector on its own non-deprecated sync fallback, and a failing read
   * degrades to that fallback with one warning instead of failing the report.
   * @param session - the session to read.
   * @returns the surface events in model-history order, or undefined to fall back.
   */
  const readSurfaceEvents = async (session: Session): Promise<readonly SessionEvent[] | undefined> => {
    const sessionQuery = ctx.get('sessionQuery') as unknown as SessionQueryService | undefined
    if (sessionQuery === undefined) return undefined
    try {
      const surface = await sessionQuery.readSurface(session.id)
      return surface.events
    } catch (error) {
      logger.warn(`session "${session.id}": surface read failed, falling back to the synchronous read: ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }

  /** Build the complete report for one session. */
  const reportFor = async (session: Session): Promise<FastReport> => {
    const snapshot = collector.snapshot(session, measure, await assembleSections(), await readSurfaceEvents(session))
    publishSnapshot(session, snapshot)
    return buildReport(
      snapshot,
      {
        sessionId: session.id,
        ...(resolved.includeCwd && session.header.cwd !== undefined ? { cwd: session.header.cwd } : {}),
        generatedAt: Date.now(),
      },
      resolved,
      VERSION,
    )
  }

  /** Append one snapshot to the session's durable history (fire-and-forget). */
  const persist = async (session: Session): Promise<void> => {
    const snapshot = collector.snapshot(session, measure, await assembleSections(), await readSurfaceEvents(session))
    publishSnapshot(session, snapshot)
    const next = appendSample(sessions.get(session.id), { at: Date.now(), snapshot }, resolved.maxHistorySamples)
    void sessions.put(session.id, next).catch((error: unknown) => {
      logger.warn(`session "${session.id}": persist failed: ${error instanceof Error ? error.message : String(error)}`)
    })
  }

  // Human slash command: the on-demand report. The definition is registered
  // inside the single lifecycle effect below, which owns every registration.
  const fastCommand = {
    name: 'fast',
    description: 'Print the dsh-fast performance report for the active session.',
    async handler(invocation: CommandInvocation) {
      const report = await reportFor(invocation.agent.session)
      return { kind: 'success', text: renderFastText(report) }
    },
  } satisfies CommandDefinition

  // Model tool: the same report as structured data.
  // Service Provider — the lifecycle effect mounts the fast_report tool (the
  // /fast slash command above registers on ctx.commands).
  const fastReportTool = defineTool({
    name: 'fast_report',
    description: 'Return the current dsh-fast performance report for the active session: session load timing, spill hits, compaction count and trigger, context-injection volume (AGENTS.md/skills/tool-schema token share), LLM cache hit rate, and optimization suggestions.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        properties: {
          generator: { type: 'string', required: true },
          version: { type: 'string', required: true },
          sessionId: { type: 'string', required: true },
          generatedAt: { type: 'number', required: true },
          load: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['open', 'restore'], required: true },
              seedEvents: { type: 'number', required: true },
              timeToFirstRequestMs: { oneOf: [{ type: 'number' }, { type: 'null' }], required: true },
            },
            additionalProperties: false,
            required: true,
          },
          spill: {
            type: 'object',
            properties: {
              detectedSpilledResults: { type: 'number', required: true },
              heuristic: { type: 'boolean', required: true },
            },
            additionalProperties: false,
            required: true,
          },
          compaction: {
            type: 'object',
            properties: {
              count: { type: 'number', required: true },
              manual: { type: 'number', required: true },
              automatic: { type: 'number', required: true },
              shadowedTokens: { type: 'number', required: true },
            },
            additionalProperties: false,
            required: true,
          },
          context: {
            type: 'object',
            properties: {
              totalTokens: { type: 'number', required: true },
              systemTokens: { type: 'number', required: true },
              toolSchemaTokens: { type: 'number', required: true },
              surfaceTokens: { type: 'number', required: true },
              systemShare: { type: 'number', required: true },
              toolsShare: { type: 'number', required: true },
              surfaceShare: { type: 'number', required: true },
              systemBreakdown: {
                type: 'object',
                properties: {
                  agentsMd: { type: 'object', properties: { tokens: { type: 'number', required: true }, chars: { type: 'number', required: true }, share: { type: 'number', required: true } }, additionalProperties: false, required: true },
                  skills: { type: 'object', properties: { tokens: { type: 'number', required: true }, chars: { type: 'number', required: true }, share: { type: 'number', required: true } }, additionalProperties: false, required: true },
                  persona: { type: 'object', properties: { tokens: { type: 'number', required: true }, chars: { type: 'number', required: true }, share: { type: 'number', required: true } }, additionalProperties: false, required: true },
                  other: { type: 'object', properties: { tokens: { type: 'number', required: true }, chars: { type: 'number', required: true }, share: { type: 'number', required: true } }, additionalProperties: false, required: true },
                },
                additionalProperties: false,
                required: true,
              },
            },
            additionalProperties: false,
            required: true,
          },
          cache: {
            type: 'object',
            properties: {
              inputTokens: { type: 'number', required: true },
              cacheReadTokens: { type: 'number', required: true },
              cacheWriteTokens: { type: 'number', required: true },
              outputTokens: { type: 'number', required: true },
              hitRate: { oneOf: [{ type: 'number' }, { type: 'null' }], required: true },
            },
            additionalProperties: false,
            required: true,
          },
          suggestions: { type: 'array', items: { type: 'string' }, required: true },
          cwd: { type: 'string' },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: renderFastText(value as FastReport) }],
    },
    async execute(_args, exec) {
      const session = exec.agent?.session
      if (session === undefined) {
        throw new Error('fast_report requires an agent-owned session')
      }
      return await reportFor(session)
    },
  })

  // One effect owns every registration and resource: the /fast command, the
  // fast_report tool, the three session listeners, the sampling timer and the
  // domain handle. The disposer tears them down in reverse registration order
  // (timer → listeners → tool → command → domain close), so an unmount during
  // apply can neither lose a registration nor leak the domain — the previous
  // shape registered all five outside any effect and had nothing to roll back.
  ctx.effect(() => {
    const disposers: Array<() => void> = [
      ctx.commands.register(fastCommand),
      ctx.tools.register(fastReportTool),
      ctx.on('session/created', (session: Session) => {
        collector.handleSessionCreated(session)
      }),
      ctx.on('session/disposed', (session: Session) => {
        collector.handleSessionDisposed(session)
      }),
      ctx.on('session/event', (session: Session, event: SessionEvent) => {
        try {
          collector.handleEvent(session, event)
        } catch (error) {
          logger.warn(`session "${session.id}": event handling failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }),
    ]
    const timer = setInterval(() => {
      for (const session of collector.liveSessions()) {
        if (!collector.isDirty(session)) continue
        collector.markClean(session)
        void persist(session)
      }
    }, resolved.snapshotIntervalMs)
    return async () => {
      clearInterval(timer)
      for (const dispose of disposers.reverse()) dispose()
      await domain.close()
    }
  })
}
