/**
 * Pure report assembly: threshold-driven suggestions, the human-readable
 * `/fast` text, and the final {@link FastReport}. Every function is pure of its
 * inputs (no I/O, clock, random, or live-service access), so it is trivially
 * unit-tested and safe to replay.
 * @module dsh-fast/analyze
 */

import type { FastReport, FastSnapshot } from './model.ts'
import type { ResolvedConfig } from './config.ts'
import { sanitizePath, sanitizeText } from './sanitize.ts'

/** Report metadata supplied by the caller (identity, optional cwd, time). */
export interface ReportMeta {
  sessionId: string
  cwd?: string
  generatedAt: number
}

/**
 * Build the optimization suggestions for a snapshot against the config
 * thresholds. Suggestions are plain strings, one per distinct finding.
 * @param snapshot - the metric snapshot.
 * @param config - the resolved config (thresholds).
 * @returns the ordered suggestions (may be empty).
 */
export function buildSuggestions(snapshot: FastSnapshot, config: ResolvedConfig): string[] {
  const suggestions: string[] = []
  const t = config.thresholds
  const { context, compaction, cache, spill } = snapshot

  if (context.systemTokens > t.systemPromptTokens) {
    suggestions.push(
      `System prompt is large (${context.systemTokens} tokens, threshold ${t.systemPromptTokens}); consider trimming AGENTS.md, the skill directory, or persona.`,
    )
  }
  if (context.toolSchemaTokens > t.toolSchemaTokens) {
    suggestions.push(
      `Tool schema is large (${context.toolSchemaTokens} tokens, threshold ${t.toolSchemaTokens}); consider mounting fewer tools or tightening parameter descriptions.`,
    )
  }
  if (context.surfaceTokens > t.surfaceTokens) {
    suggestions.push(
      `Session surface is large (${context.surfaceTokens} tokens, threshold ${t.surfaceTokens}); consider /compact or clearing old tool results.`,
    )
  }
  if (compaction.count >= t.compactionCountWarn) {
    suggestions.push(
      `This session has triggered ${compaction.count} compactions; context pressure is high — compact earlier or raise the compaction threshold.`,
    )
  }
  if (compaction.count > 0) {
    const average = compaction.shadowedTokens / compaction.count
    if (average > t.compactionShadowTokens) {
      suggestions.push(
        `Average compaction shadows ${Math.round(average)} tokens (threshold ${t.compactionShadowTokens}); the compaction threshold may be too conservative.`,
      )
    }
  }
  if (cache.hitRate !== null && cache.hitRate < t.cacheHitRateFloor) {
    suggestions.push(
      `LLM cache hit rate is only ${Math.round(cache.hitRate * 100)}% (threshold ${Math.round(t.cacheHitRateFloor * 100)}%); consider enabling or tuning prompt caching.`,
    )
  }
  if (spill.detectedSpilledResults === 0 && context.surfaceTokens > t.surfaceTokens / 2) {
    suggestions.push(
      'Surface volume is high with no spill hits; if spill-policy is not enabled, consider enabling it to protect the context window.',
    )
  }
  return suggestions
}

/** Format one nullable millisecond duration. */
function formatMs(value: number | null): string {
  return value === null ? 'n/a' : `${value} ms`
}

/** Format one nullable ratio as a percentage. */
function formatPercent(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`
}

/**
 * Render a report as the human-readable `/fast` body.
 * @param report - the assembled report.
 * @returns the report text.
 */
export function renderFastText(report: FastReport): string {
  const { load, spill, compaction, context, cache } = report
  const lines = [
    `dsh-fast ${report.version} — performance report`,
    `session: ${report.sessionId}`,
    '',
    '## Session load',
    `kind: ${load.kind}`,
    `seed events: ${load.seedEvents}`,
    `time to first request: ${formatMs(load.timeToFirstRequestMs)}`,
    '',
    '## Spill',
    `detected spilled results: ${spill.detectedSpilledResults} (heuristic)`,
    '',
    '## Compaction',
    `count: ${compaction.count} (manual: ${compaction.manual}, automatic: ${compaction.automatic})`,
    `shadowed tokens: ${compaction.shadowedTokens}`,
    '',
    '## Context volume',
    `total: ${context.totalTokens} tokens`,
    `system (AGENTS.md/skills/persona): ${context.systemTokens} (${formatPercent(context.systemShare)})`,
    `tool schema: ${context.toolSchemaTokens} (${formatPercent(context.toolsShare)})`,
    `surface: ${context.surfaceTokens} (${formatPercent(context.surfaceShare)})`,
    '',
    '## LLM cache',
    `input: ${cache.inputTokens}, cache read: ${cache.cacheReadTokens}, cache write: ${cache.cacheWriteTokens}, output: ${cache.outputTokens}`,
    `hit rate: ${formatPercent(cache.hitRate)}`,
  ]
  if (report.cwd !== undefined) {
    lines.splice(lines.length, 0, `cwd: ${report.cwd}`)
  }
  lines.push('', '## Suggestions')
  if (report.suggestions.length === 0) {
    lines.push('- none')
  } else {
    for (const suggestion of report.suggestions) lines.push(`- ${suggestion}`)
  }
  return lines.join('\n')
}

/**
 * Assemble the final report from a snapshot plus caller metadata. Suggestions
 * are computed here and the identity/cwd fields are sanitized before any model
 * or durable surface sees them.
 * @param snapshot - the metric snapshot.
 * @param meta - session identity, optional cwd, and generation time.
 * @param config - the resolved config (thresholds).
 * @param version - the plugin version.
 * @returns the complete report.
 */
export function buildReport(snapshot: FastSnapshot, meta: ReportMeta, config: ResolvedConfig, version: string): FastReport {
  return {
    ...snapshot,
    generator: 'dsh-fast',
    version,
    sessionId: sanitizeText(meta.sessionId, 128),
    generatedAt: meta.generatedAt,
    suggestions: buildSuggestions(snapshot, config),
    ...(meta.cwd === undefined ? {} : { cwd: sanitizePath(meta.cwd, 256) }),
  }
}
