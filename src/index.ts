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
// Type-only: registers the `ctx.commands` Context merge for the inject.
import type {} from '@deepseek-ai/dsh-commands'
import { Config, resolveConfig } from './config.ts'
import { FastCollector } from './collector.ts'
import type { MeasureFn, TokenMeasurement } from './collector.ts'
import { buildReport, renderFastText } from './analyze.ts'
import type { FastReport } from './model.ts'
import { fastDomainSpec, appendSample } from './store.ts'
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
} from './model.ts'
export { FastCollector, detectSpilledResult, flattenToolResultText, sharesOf, hitRateOf } from './collector.ts'
export { buildReport, buildSuggestions, renderFastText } from './analyze.ts'
export { fastDomainSpec, appendSample, historySchema } from './store.ts'

/** The structural surface of the optional `ctx.tokenMeter` service. */
interface TokenMeterService {
  measure(session: Session): TokenMeasurement
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
  const sessions = domain.table('sessions')

  /** Lazy, contained lookup of the optional token meter. */
  const measure: MeasureFn = (session) => {
    const meter = ctx.get('tokenMeter') as unknown as TokenMeterService | undefined
    if (meter === undefined) return undefined
    try {
      const measurement = meter.measure(session)
      return { totalTokens: measurement.totalTokens, surfaceTokens: measurement.surfaceTokens }
    } catch (error) {
      logger.warn(`token meter measurement failed: ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }

  /** Build the complete report for one session. */
  const reportFor = (session: Session): FastReport => {
    const snapshot = collector.snapshot(session, measure)
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
  const persist = (session: Session): void => {
    const snapshot = collector.snapshot(session, measure)
    const next = appendSample(sessions.get(session.id), { at: Date.now(), snapshot }, resolved.maxHistorySamples)
    void sessions.put(session.id, next).catch((error: unknown) => {
      logger.warn(`session "${session.id}": persist failed: ${error instanceof Error ? error.message : String(error)}`)
    })
  }

  // Human slash command: the on-demand report.
  ctx.commands.register({
    name: 'fast',
    description: 'Print the dsh-fast performance report for the active session.',
    handler: (invocation) => {
      const report = reportFor(invocation.agent.session)
      return { kind: 'success', text: renderFastText(report) }
    },
  })

  // Model tool: the same report as structured data.
  ctx.tools.register(defineTool({
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
      return reportFor(session)
    },
  }))

  // Session lifecycle: adopt and fold.
  ctx.on('session/created', (session: Session) => {
    collector.handleSessionCreated(session)
  })
  ctx.on('session/disposed', (session: Session) => {
    collector.handleSessionDisposed(session)
  })
  ctx.on('session/event', (session: Session, event: SessionEvent) => {
    try {
      collector.handleEvent(session, event)
    } catch (error) {
      logger.warn(`session "${session.id}": event handling failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  })

  // Async sampling: one effect owns the timer and the domain teardown.
  ctx.effect(() => {
    const timer = setInterval(() => {
      for (const session of collector.liveSessions()) {
        if (!collector.isDirty(session)) continue
        collector.markClean(session)
        persist(session)
      }
    }, resolved.snapshotIntervalMs)
    return async () => {
      clearInterval(timer)
      await domain.close()
    }
  })
}
