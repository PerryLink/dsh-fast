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
import type { SystemPromptBreakdown } from './model.ts'

/** Fixed text-density estimate (chars per token). */
const CHARS_PER_TOKEN = 4

/** Role-field framing overhead added to every priced message. */
const ROLE_OVERHEAD = 4

/** Per-block structural overhead for JSON framing and type tags. */
const BLOCK_OVERHEAD = 4

/** One named system-prompt section (name + resolved text). */
export interface SystemSection {
  name: string
  text: string
}

/** Which tracked bucket a section name belongs to. */
function bucketOf(name: string): 'agentsMd' | 'skills' | 'persona' | 'other' {
  if (name === 'deployment:persona') return 'persona'
  if (name.toLowerCase().includes('skill')) return 'skills'
  if (/agent|instructions?/iu.test(name)) return 'agentsMd'
  return 'other'
}

/** An empty breakdown (all buckets zeroed). */
function emptyBreakdown(): SystemPromptBreakdown {
  return {
    agentsMd: { tokens: 0, chars: 0, share: 0 },
    skills: { tokens: 0, chars: 0, share: 0 },
    persona: { tokens: 0, chars: 0, share: 0 },
    other: { tokens: 0, chars: 0, share: 0 },
  }
}

/**
 * Classify the named system-prompt sections into the AGENTS.md / skills /
 * persona / other buckets, with heuristic tokens and per-bucket shares. The
 * caller supplies either the real assembled sections (via the optional
 * `systemPrompt` service) or a single synthetic `{ name: 'other' }` section
 * carrying the rendered prompt, so the breakdown always sums to the system
 * prompt.
 * @param sections - named sections (never empty in practice).
 * @returns the per-bucket breakdown.
 */
export function classifySystemSections(sections: readonly SystemSection[]): SystemPromptBreakdown {
  const breakdown = emptyBreakdown()
  for (const section of sections) {
    const chars = section.text.length
    if (chars === 0) continue
    const bucket = breakdown[bucketOf(section.name)]
    bucket.chars += chars
    bucket.tokens += Math.ceil(chars / CHARS_PER_TOKEN)
  }
  const total = breakdown.agentsMd.tokens + breakdown.skills.tokens + breakdown.persona.tokens + breakdown.other.tokens
  if (total <= 0) return breakdown
  for (const bucket of [breakdown.agentsMd, breakdown.skills, breakdown.persona, breakdown.other] as const) {
    bucket.share = bucket.tokens / total
  }
  return breakdown
}

/**
 * Price the assembled system prompt (harness identity + persona + tool
 * guidance + plugin sections).
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
