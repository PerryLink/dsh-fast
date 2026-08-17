/**
 * Pure report assembly: threshold-driven suggestions, `/fast` text rendering,
 * and report sanitization.
 * @module dsh-fast/test/analyze.spec
 */

import { describe, expect, it } from 'vitest'
import { buildReport, buildSuggestions, renderFastText } from '../src/analyze.ts'
import { resolveConfig } from '../src/config.ts'
import type { FastSnapshot } from '../src/model.ts'

/** A baseline snapshot whose context volume is under every default threshold. */
function snapshot(overrides: Partial<FastSnapshot> = {}): FastSnapshot {
  return {
    load: { kind: 'open', seedEvents: 0, timeToFirstRequestMs: 150 },
    spill: { detectedSpilledResults: 0, heuristic: true },
    compaction: { count: 0, manual: 0, automatic: 0, shadowedTokens: 0 },
    context: {
      totalTokens: 1_000,
      systemTokens: 400,
      toolSchemaTokens: 200,
      surfaceTokens: 400,
      systemShare: 0.4,
      toolsShare: 0.2,
      surfaceShare: 0.4,
    },
    cache: { inputTokens: 800, cacheReadTokens: 200, cacheWriteTokens: 50, outputTokens: 100, hitRate: 0.2 },
    ...overrides,
  }
}

describe('buildSuggestions', () => {
  it('returns no suggestions under every threshold', () => {
    expect(buildSuggestions(snapshot(), resolveConfig({}))).toEqual([])
  })

  it('flags an oversized system prompt', () => {
    const suggestions = buildSuggestions(
      snapshot({ context: { ...snapshot().context, systemTokens: 50_000 } }),
      resolveConfig({}),
    )
    expect(suggestions.some(s => s.includes('System prompt is large'))).toBe(true)
  })

  it('flags an oversized tool schema and surface', () => {
    const suggestions = buildSuggestions(
      snapshot({ context: { ...snapshot().context, toolSchemaTokens: 20_000, surfaceTokens: 90_000 } }),
      resolveConfig({}),
    )
    expect(suggestions.some(s => s.includes('Tool schema is large'))).toBe(true)
    expect(suggestions.some(s => s.includes('Session surface is large'))).toBe(true)
  })

  it('flags compaction pressure and a low cache hit rate', () => {
    const suggestions = buildSuggestions(
      snapshot({
        compaction: { count: 12, manual: 2, automatic: 10, shadowedTokens: 500_000 },
        cache: { inputTokens: 1_000, cacheReadTokens: 0, cacheWriteTokens: 100, outputTokens: 500, hitRate: 0 },
      }),
      resolveConfig({}),
    )
    expect(suggestions.some(s => s.includes('triggered 12 compactions'))).toBe(true)
    expect(suggestions.some(s => s.includes('may be too conservative'))).toBe(true)
    expect(suggestions.some(s => s.includes('cache hit rate is only 0%'))).toBe(true)
  })

  it('suggests spill-policy when surface is high but nothing spilled', () => {
    const suggestions = buildSuggestions(
      snapshot({ context: { ...snapshot().context, surfaceTokens: 50_000 } }),
      resolveConfig({}),
    )
    expect(suggestions.some(s => s.includes('spill-policy'))).toBe(true)
  })
})

describe('renderFastText', () => {
  it('renders every section plus suggestions', () => {
    const report = buildReport(snapshot(), { sessionId: 'abc', generatedAt: 1_700_000_000_000 }, resolveConfig({}), '0.1.0')
    const text = renderFastText(report)
    expect(text).toContain('dsh-fast 0.1.0')
    expect(text).toContain('session: abc')
    expect(text).toContain('## Session load')
    expect(text).toContain('## Spill')
    expect(text).toContain('## Compaction')
    expect(text).toContain('## Context volume')
    expect(text).toContain('## LLM cache')
    expect(text).toContain('## Suggestions')
  })

  it('renders "none" when there are no suggestions', () => {
    const report = buildReport(snapshot(), { sessionId: 'abc', generatedAt: 1 }, resolveConfig({}), '0.1.0')
    expect(renderFastText(report)).toContain('- none')
  })
})

describe('buildReport', () => {
  it('sanitizes the session id and omits cwd by default', () => {
    const report = buildReport(snapshot(), { sessionId: 'id\u0000with\u001fcontrols', generatedAt: 1 }, resolveConfig({}), '0.1.0')
    expect(report.sessionId).toBe('idwithcontrols')
    expect(report.cwd).toBeUndefined()
    expect(report.generator).toBe('dsh-fast')
  })

  it('includes a sanitized cwd when supplied', () => {
    const report = buildReport(
      snapshot(),
      { sessionId: 'abc', cwd: `/very/long/path/${'segment/'.repeat(40)}report-final.txt`, generatedAt: 1 },
      resolveConfig({}),
      '0.1.0',
    )
    expect(report.cwd).toBeDefined()
    expect(report.cwd).toContain('…')
    expect(report.cwd).toContain('report-final.txt')
  })
})
