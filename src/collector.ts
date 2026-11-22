/**
 * The session/event collector: folds the durable session log into per-session
 * counters and builds {@link FastSnapshot}s. All inline work is O(1) per event
 * (increment counters, record the latest header) — the expensive context
 * measurement is deferred to {@link snapshot}, which runs on the async
 * sampling timer or on demand, never in the append hot path. State lives in a
 * `Map` keyed by the live Session so the timer can iterate it.
 * @module dsh-fast/collector
 */

import type { EpochHeader, Session, SessionEvent, SystemMessage, ToolResultMessage } from '@deepseek-ai/dsh-session'
// Type-only: registers the `compaction/*` SessionEventMap merge this collector folds.
import type {} from '@deepseek-ai/dsh-compaction'
import type { FastSnapshot, CacheStats, ContextStats } from './model.ts'
import type { ResolvedConfig } from './config.ts'
import {
  classifySystemSections,
  estimateLegacySystemTokens,
  estimateToolsTokens,
  type SystemSection,
} from './estimate.ts'

/**
 * The structural surface of the optional `ctx.tokenMeter` service. Only the
 * fields dsh-fast reads are declared; the service is optional, so a host
 * without it still reports system/tool-schema volumes (surface/total fall back
 * to the heuristic header+surface sum). On 0.1.5-alpha.1 `surfaceTokens`
 * includes the `system/message` surface node, which {@link FastCollector.snapshot}
 * subtracts so the surface bucket stays conversation history.
 */
export interface TokenMeasurement {
  readonly totalTokens: number
  readonly surfaceTokens: number
}

/** Lazy lookup of the optional token meter. */
export type MeasureFn = (session: Session) => TokenMeasurement | undefined

/** The durable marker every spill notice carries (`... Full ... stored at: <locator> ...`). */
const SPILL_NOTICE_MARKERS = ['Full', 'stored at:'] as const

/**
 * The effective system prompt as durable sections. Host releases from
 * `0.2.3-alpha.1` on append `system/message` events that carry section
 * updates rather than complete prompts, so consumers must accumulate them: a
 * replacement event (an object `surfaceOp`) rebuilds the assembly from its own
 * sections, while an appended event applies only the sections it names (active
 * sets, retired removes; the latest registration per name wins). Events without
 * `source.sections` are legacy complete prompts that replace the assembly; the
 * next sectioned event supersedes them.
 * @param surfaceEvents - the current surface events in model-history order
 *   (from the optional `sessionQuery` service, or {@link surfaceEventsOf}).
 * @returns the ordered live sections and their concatenated text, or undefined
 *   when no active system prompt remains.
 */
export function effectiveSystemSections(surfaceEvents: readonly SessionEvent[]): { sections: SystemSection[]; text: string } | undefined {
  const live = new Map<string, { name: string; text: string; order: number }>()
  let legacy: string | undefined
  for (const event of surfaceEvents) {
    if (event.type !== 'system/message') continue
    const message = event.data.message
    const sourceSections = (message.source as unknown as { sections?: unknown }).sections
    if (!Array.isArray(sourceSections)) {
      const text = systemTextOf(message)
      // An empty legacy node is dormant: it neither overwrites nor restores.
      if (text.length === 0) continue
      legacy = text
      live.clear()
      continue
    }
    const surfaceOp = (event as unknown as { surfaceOp?: unknown }).surfaceOp
    if (typeof surfaceOp === 'object' && surfaceOp !== null) live.clear()
    legacy = undefined
    for (const raw of sourceSections as readonly { name?: unknown; state?: unknown; order?: unknown; contentIndex?: unknown }[]) {
      if (typeof raw.name !== 'string') continue
      if (raw.state === 'retired') { live.delete(raw.name); continue }
      if (raw.state !== 'active') continue
      const index = typeof raw.contentIndex === 'number' ? raw.contentIndex : -1
      const block = index >= 0 ? message.content[index] : undefined
      const text = block === undefined ? '' : block.type === 'text' ? block.text : JSON.stringify(block)
      const order = typeof raw.order === 'number' ? raw.order : 0
      live.set(raw.name, { name: raw.name, text, order })
    }
  }
  const ordered = [...live.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  if (ordered.length === 0) {
    return legacy === undefined ? undefined : { sections: [{ name: 'other', text: legacy }], text: legacy }
  }
  const sections: SystemSection[] = ordered.map(({ name, text }) => ({ name, text }))
  return { sections, text: sections.map((section) => section.text).join('\n') }
}

/**
 * The current surface events of a live session, resolved from one snapshot of
 * the accepted log. This is the fallback read for hosts that compose no
 * `sessionQuery` service: it replaces the deprecated `Session.eventAt(seq)`
 * accessor (new calls are prohibited) while keeping the same surface-node
 * order and the same log as the source of truth.
 * @param session - the session to read.
 * @returns the surface events in model-history order.
 */
export function surfaceEventsOf(session: Session): readonly SessionEvent[] {
  const bySeq = new Map<number, SessionEvent>()
  for (const event of session.snapshotEvents()) bySeq.set(event.seq, event)
  const events: SessionEvent[] = []
  for (const seq of session.surface.nodes) {
    const event = bySeq.get(seq)
    if (event !== undefined) events.push(event)
  }
  return events
}

/** The display/durable text of a system message (text blocks plus structural JSON). */
function systemTextOf(message: SystemMessage): string {
  let text = ''
  for (const block of message.content) text += block.type === 'text' ? block.text : JSON.stringify(block)
  return text
}

/**
 * Structural read of the pre-0.1.5 `EpochHeader.system` string, removed from
 * the public type when the prompt moved to surface node 0. This keeps the
 * runtime fallback for the `0.1.2-rc.1` peer line.
 * @param header - canonical request envelope, or undefined before any request.
 * @returns the legacy prompt text, or undefined when absent.
 */
function legacySystemText(header: EpochHeader | undefined): string | undefined {
  const system = (header as { system?: unknown } | undefined)?.system
  return typeof system === 'string' ? system : undefined
}

/**
 * Structural read of one tool result's model-facing blocks, across both released
 * representations. Through the V3 wrapper shape the blocks travelled inside ONE
 * `tool-result` block (`message.content[0].content`); session format V4 — the
 * `0.1.7` line — made the tool result a first-class message and the blocks are
 * inline, while `'tool-result'` left `ContentBlockMap` entirely. Reading both
 * shapes keeps the reported metrics identical on every supported host line.
 * @param message - the tool-role message.
 * @returns the model-facing blocks, in order.
 */
function toolResultBlocks(message: ToolResultMessage): readonly ToolResultMessage['content'][number][] {
  const content = message.content
  const wrapper = content[0] as { type?: unknown; content?: unknown } | undefined
  if (wrapper !== undefined && wrapper.type === 'tool-result' && Array.isArray(wrapper.content)) {
    return wrapper.content as readonly ToolResultMessage['content'][number][]
  }
  return content
}

/** Flatten a tool result's model-facing text blocks to one string. */
export function flattenToolResultText(message: ToolResultMessage): string {
  let text = ''
  for (const block of toolResultBlocks(message)) {
    if (block.type === 'text') text += block.text
  }
  return text
}

/**
 * Best-effort spill detection: a spilled tool result is one whose durable text
 * carries the spill-policy notice (`Full … stored at: <locator>`). No dedicated
 * session event exists, so this is a documented heuristic, not a hard signal.
 * @param message - the tool result message.
 * @returns true when the result looks spilled.
 */
export function detectSpilledResult(message: ToolResultMessage): boolean {
  const text = flattenToolResultText(message)
  return SPILL_NOTICE_MARKERS.every(marker => text.includes(marker))
}

/** Fraction of `total` each bucket represents (0 when the total is 0). */
export function sharesOf(
  total: number,
  system: number,
  tools: number,
  surface: number,
): Pick<ContextStats, 'systemShare' | 'toolsShare' | 'surfaceShare'> {
  if (total <= 0) return { systemShare: 0, toolsShare: 0, surfaceShare: 0 }
  return {
    systemShare: system / total,
    toolsShare: tools / total,
    surfaceShare: surface / total,
  }
}

/** Cache hit rate from aggregate tokens: `cacheRead / (input + cacheRead)`. */
export function hitRateOf(input: number, cacheRead: number): number | null {
  const denominator = input + cacheRead
  if (denominator <= 0) return null
  return cacheRead / denominator
}

/** Per-session live state. */
interface FastState {
  readonly session: Session
  readonly createdAtMs: number
  readonly kind: 'open' | 'restore'
  readonly firstLiveSeq: number
  timeToFirstRequestMs: number | null
  spilledResults: number
  compactionCount: number
  compactionManual: number
  compactionAutomatic: number
  compactionShadowedTokens: number
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  lastHeader: EpochHeader | undefined
  dirty: boolean
}

/**
 * The event → snapshot collector over real Sessions. State is adopted lazily on
 * the first event so an HMR reload (which does not replay `session/created`)
 * still adopts existing live sessions.
 */
export class FastCollector {
  private readonly live = new Map<Session, FastState>()

  /** @param config - the resolved plugin config. */
  constructor(private readonly config: ResolvedConfig) {}

  /** Adopt a session at its creation announcement. */
  handleSessionCreated(session: Session): void {
    this.adopt(session)
  }

  /** Drop a session leaving the store. */
  handleSessionDisposed(session: Session): void {
    this.live.delete(session)
  }

  /**
   * Fold one appended session event (O(1) per event).
   * @param session - the session the event belongs to.
   * @param event - the appended event.
   */
  handleEvent(session: Session, event: SessionEvent): void {
    const state = this.adopt(session)
    switch (event.type) {
      case 'request/header':
        state.lastHeader = event.data.header
        if (state.timeToFirstRequestMs === null) {
          state.timeToFirstRequestMs = Math.max(0, event.time - state.createdAtMs)
          state.dirty = true
        }
        break
      case 'assistant/message':
        this.foldUsage(state, event.data.usage)
        break
      case 'compaction/start':
        state.compactionCount += 1
        if (event.data.sourceCommandId === undefined) state.compactionAutomatic += 1
        else state.compactionManual += 1
        state.dirty = true
        break
      case 'compaction/summary':
        state.compactionShadowedTokens += event.data.shadowedTokenCount
        state.dirty = true
        break
      case 'tool/result':
        if (this.config.detectSpilledResults && detectSpilledResult(event.data.message)) {
          state.spilledResults += 1
          state.dirty = true
        }
        break
      default:
        // Unknown or plugin-owned session events: nothing to fold.
        break
    }
  }

  /** The live sessions the sampling timer iterates. */
  liveSessions(): IterableIterator<Session> {
    return this.live.keys()
  }

  /** Whether a session is still live (adopted and not disposed). */
  has(session: Session): boolean {
    return this.live.has(session)
  }

  /** Whether a session has un-persisted changes. */
  isDirty(session: Session): boolean {
    return this.live.get(session)?.dirty ?? false
  }

  /** Clear the dirty flag after a snapshot is appended. */
  markClean(session: Session): void {
    const state = this.live.get(session)
    if (state !== undefined) state.dirty = false
  }

  /**
   * Build the current metric snapshot for one session. This is the only place
   * the optional token meter is consulted, so it never runs in the append path.
   * @param session - the session to snapshot.
   * @param measure - optional token-meter measure function.
   * @param sections - optional named system-prompt sections (from the optional
   *   `systemPrompt` service); absent = the whole rendered system prompt is
   *   attributed to the `other` bucket.
   * @param surfaceEvents - optional pre-read surface events (the async
   *   `sessionQuery` read path); absent = the sync fallback read.
   * @returns the snapshot.
   */
  snapshot(session: Session, measure?: MeasureFn, sections?: readonly SystemSection[], surfaceEvents?: readonly SessionEvent[]): FastSnapshot {
    const state = this.live.get(session)
    if (state === undefined) return emptySnapshot()
    const measurement = measure === undefined ? undefined : measure(session)
    const effective = effectiveSystemSections(surfaceEvents ?? surfaceEventsOf(session))
    const legacySystem = effective === undefined ? legacySystemText(state.lastHeader) : undefined
    const systemTokens = effective === undefined
      ? estimateLegacySystemTokens(legacySystem)
      : estimateLegacySystemTokens(effective.text)
    const toolSchemaTokens = estimateToolsTokens(state.lastHeader)
    const measuredSurfaceTokens = measurement?.surfaceTokens ?? 0
    // 0.1.5-alpha.1 prices the system prompt into the meter's surface (surface
    // node 0), so subtract it and keep the surface bucket conversation history.
    // The legacy line kept `header.system` out of the meter surface entirely.
    const surfaceTokens = effective === undefined
      ? measuredSurfaceTokens
      : Math.max(0, measuredSurfaceTokens - systemTokens)
    const totalTokens = measurement?.totalTokens ?? (systemTokens + toolSchemaTokens + surfaceTokens)
    const systemText = effective === undefined ? legacySystem : effective.text
    const syntheticSections: readonly SystemSection[] = effective !== undefined && effective.sections.length > 0
      ? effective.sections
      : systemText === undefined || systemText.length === 0
        ? []
        : [{ name: 'other', text: systemText }]
    const systemBreakdown = classifySystemSections(sections ?? syntheticSections)
    return {
      load: {
        kind: state.kind,
        seedEvents: state.firstLiveSeq,
        timeToFirstRequestMs: state.timeToFirstRequestMs,
      },
      spill: { detectedSpilledResults: state.spilledResults, heuristic: true },
      compaction: {
        count: state.compactionCount,
        manual: state.compactionManual,
        automatic: state.compactionAutomatic,
        shadowedTokens: state.compactionShadowedTokens,
      },
      context: {
        totalTokens,
        systemTokens,
        toolSchemaTokens,
        surfaceTokens,
        ...sharesOf(totalTokens, systemTokens, toolSchemaTokens, surfaceTokens),
        systemBreakdown,
      },
      cache: this.cacheStats(state),
    }
  }

  /** Aggregate cache counters into the report shape. */
  private cacheStats(state: FastState): CacheStats {
    return {
      inputTokens: state.inputTokens,
      cacheReadTokens: state.cacheReadTokens,
      cacheWriteTokens: state.cacheWriteTokens,
      outputTokens: state.outputTokens,
      hitRate: hitRateOf(state.inputTokens, state.cacheReadTokens),
    }
  }

  /** Fold one provider usage record. */
  private foldUsage(
    state: FastState,
    usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number } | undefined,
  ): void {
    if (usage === undefined) return
    state.inputTokens += usage.inputTokens
    state.outputTokens += usage.outputTokens
    state.cacheReadTokens += usage.cacheReadTokens ?? 0
    state.cacheWriteTokens += usage.cacheWriteTokens ?? 0
    state.dirty = true
  }

  /** Adopt (or return the existing) live state for one session. */
  private adopt(session: Session): FastState {
    const existing = this.live.get(session)
    if (existing !== undefined) return existing
    const state: FastState = {
      session,
      createdAtMs: Date.now(),
      kind: session.firstLiveSeq > 0 ? 'restore' : 'open',
      firstLiveSeq: session.firstLiveSeq,
      timeToFirstRequestMs: null,
      spilledResults: 0,
      compactionCount: 0,
      compactionManual: 0,
      compactionAutomatic: 0,
      compactionShadowedTokens: 0,
      inputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      lastHeader: undefined,
      dirty: true,
    }
    this.live.set(session, state)
    return state
  }
}

/** A zeroed snapshot for a session that is no longer live. */
function emptySnapshot(): FastSnapshot {
  return {
    load: { kind: 'open', seedEvents: 0, timeToFirstRequestMs: null },
    spill: { detectedSpilledResults: 0, heuristic: true },
    compaction: { count: 0, manual: 0, automatic: 0, shadowedTokens: 0 },
    context: {
      totalTokens: 0,
      systemTokens: 0,
      toolSchemaTokens: 0,
      surfaceTokens: 0,
      systemShare: 0,
      toolsShare: 0,
      surfaceShare: 0,
      systemBreakdown: {
        agentsMd: { tokens: 0, chars: 0, share: 0 },
        skills: { tokens: 0, chars: 0, share: 0 },
        persona: { tokens: 0, chars: 0, share: 0 },
        other: { tokens: 0, chars: 0, share: 0 },
      },
    },
    cache: { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, hitRate: null },
  }
}
