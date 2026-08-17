/**
 * Owned JSON data model shared by the `/fast` command, the `fast_report` tool,
 * and the `fast/*` session events. Everything here is plain lossless-JSON data
 * already detached from live harness objects, so a `FastSnapshot` is exactly
 * what gets appended to the session log and a `FastReport` is exactly what the
 * model-facing tool returns. No Cordis/Session reference crosses the tool or
 * the session-log boundary.
 * @module dsh-fast/model
 */

/** One session-load measurement: how a session became ready to serve. */
export interface LoadStats {
  /** `open` for a fresh session, `restore` for a resumed/seeded one. */
  kind: 'open' | 'restore'
  /** Number of restored/replayed seed events at construction (0 for a fresh open). */
  seedEvents: number
  /** Publication-to-first-request latency in milliseconds; `null` before the first request. */
  timeToFirstRequestMs: number | null
}

/** One durable sample persisted to the storage domain, with its capture time. */
export interface StoredSample {
  at: number
  snapshot: FastSnapshot
}

/** Spill-hit statistics derived from the durable tool results. */
export interface SpillStats {
  /** Tool results detected as spilled to a session-scoped artifact (best-effort heuristic). */
  detectedSpilledResults: number
  /** Always true: spill detection reads the durable notice marker, not a dedicated event. */
  heuristic: boolean
}

/** Compaction count and trigger attribution over the durable log. */
export interface CompactionStats {
  /** Total compaction attempts (one `compaction/start` each). */
  count: number
  /** Compactions started by a slash command (`sourceCommandId` present). */
  manual: number
  /** Compactions started by automatic pressure (`sourceCommandId` absent). */
  automatic: number
  /** Sum of `shadowedTokenCount` across completed summaries. */
  shadowedTokens: number
}

/** Context-injection volume: where the request context's tokens live. */
export interface ContextStats {
  /** Canonical current pressure (token-meter total), or the heuristic header+surface sum. */
  totalTokens: number
  /** Assembled system-prompt tokens — AGENTS.md, skill directory, persona, and harness instructions. */
  systemTokens: number
  /** Tool-schema tokens. */
  toolSchemaTokens: number
  /** Conversation-surface tokens (message history). */
  surfaceTokens: number
  /** `systemTokens / totalTokens` (0 when the total is 0). */
  systemShare: number
  /** `toolSchemaTokens / totalTokens` (0 when the total is 0). */
  toolsShare: number
  /** `surfaceTokens / totalTokens` (0 when the total is 0). */
  surfaceShare: number
}

/** LLM cache accounting aggregated from `assistant/message` usage. */
export interface CacheStats {
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  /** `cacheRead / (input + cacheRead)`; `null` when no input-plus-cache-read tokens exist. */
  hitRate: number | null
}

/** The complete metric snapshot persisted to the storage domain. */
export interface FastSnapshot {
  load: LoadStats
  spill: SpillStats
  compaction: CompactionStats
  context: ContextStats
  cache: CacheStats
}

/** The complete model- and human-facing report (`/fast` and `fast_report`). */
export interface FastReport extends FastSnapshot {
  /** `dsh-fast`. */
  generator: string
  /** Plugin version. */
  version: string
  /** Sanitized session identity. */
  sessionId: string
  /** Epoch milliseconds of report generation. */
  generatedAt: number
  /** Optimization suggestions, already localized to plain strings. */
  suggestions: string[]
  /** Sanitized session working directory; present only when `privacy.includeCwd` is enabled. */
  cwd?: string
}
