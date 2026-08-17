/**
 * Fixed-density heuristic token pricing for the context-injection breakdown.
 * Mirrors the shared estimator in `@deepseek-ai/dsh-token-meter` (which is not
 * exported as a public subpath), so `dsh-fast`'s system/tool figures match the
 * token meter's heuristic vocabulary: `ceil(chars / 4)` plus framing overhead.
 * These are protocol constants, not tunables — they must not drift from the
 * meter they mirror.
 * @module dsh-fast/estimate
 */

import type { EpochHeader } from '@deepseek-ai/dsh-session'

/** Fixed text-density estimate (chars per token). */
const CHARS_PER_TOKEN = 4

/** Role-field framing overhead added to every priced message. */
const ROLE_OVERHEAD = 4

/** Per-block structural overhead for JSON framing and type tags. */
const BLOCK_OVERHEAD = 4

/**
 * Price the assembled system prompt (AGENTS.md + skill directory + persona +
 * harness instructions).
 * @param header - canonical request envelope, or undefined before any request.
 * @returns heuristic system-prompt tokens; 0 when absent.
 */
export function estimateSystemTokens(header: EpochHeader | undefined): number {
  if (header?.system === undefined) return 0
  return Math.ceil(header.system.length / CHARS_PER_TOKEN) + ROLE_OVERHEAD
}

/**
 * Price the tool-schema part of the request envelope.
 * @param header - canonical request envelope, or undefined before any request.
 * @returns heuristic tool-schema tokens; 0 when absent or empty.
 */
export function estimateToolsTokens(header: EpochHeader | undefined): number {
  if (header?.tools === undefined || header.tools.length === 0) return 0
  return Math.ceil(JSON.stringify(header.tools).length / CHARS_PER_TOKEN) + BLOCK_OVERHEAD
}
