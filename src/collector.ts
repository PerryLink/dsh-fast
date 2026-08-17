/**
 * The session/event collector: folds the durable session log into per-session
 * counters and builds {@link FastSnapshot}s. All inline work is O(1) per event
 * (increment counters, record the latest header) — the expensive context
 * measurement is deferred to {@link snapshot}, which runs on the async
 * sampling timer or on demand, never in the append hot path. State lives in a
 * `Map` keyed by the live Session so the timer can iterate it.
 * @module dsh-fast/collector
 */

import type { Session, SessionEvent, ToolResultMessage } from '@deepseek-ai/dsh-session'
// Type-only: registers the `compaction/*` SessionEventMap merge this collector folds.
import type {} from '@deepseek-ai/dsh-compaction'
import type { FastSnapshot, CacheStats, ContextStats } from './model.ts'
import type { ResolvedConfig } from './config.ts'
import { estimateSystemTokens, estimateToolsTokens } from './estimate.ts'

/**
 * The structural surface of the optional `ctx.tokenMeter` service. Only the
 * fields dsh-fast reads are declared; the service is optional, so a host
 * without it still reports system/tool-schema volumes (surface/total fall back
 * to the header heuristic).
 */
export interface TokenMeasurement {
  readonly totalTokens: number
  readonly surfaceTokens: number
}

/** Lazy lookup of the optional token meter. */
export type MeasureFn = (session: Session) => TokenMeasurement | undefined

/** The durable marker every spill notice carries (`... Full ... stored at: <locator> ...`). */
const SPILL_NOTICE_MARKERS = ['Full', 'stored at:'] as const

/** Flatten a tool result's model-facing text blocks to one string. */
export function flattenToolResultText(message: ToolResultMessage): string {
  const block = message.content[0]
  if (block === undefined) return ''
  let text = ''
  for (const inner of block.content) {
    if (inner.type === 'text') text += inner.text
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
  lastHeader: import('@deepseek-ai/dsh-session').EpochHeader | undefined
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
   * @returns the snapshot.
   */
  snapshot(session: Session, measure?: MeasureFn): FastSnapshot {
    const state = this.live.get(session)
    if (state === undefined) return emptySnapshot()
    const measurement = measure === undefined ? undefined : measure(session)
    const systemTokens = estimateSystemTokens(state.lastHeader)
    const toolSchemaTokens = estimateToolsTokens(state.lastHeader)
    const surfaceTokens = measurement?.surfaceTokens ?? 0
    const totalTokens = measurement?.totalTokens ?? (systemTokens + toolSchemaTokens + surfaceTokens)
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
    },
    cache: { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, hitRate: null },
  }
}
