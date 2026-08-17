/**
 * Durable metric storage: bounded history append and the durable-boundary zod
 * schema. The storage-domain facility itself is a tested harness seam; this
 * covers the plugin-owned logic around it.
 * @module dsh-fast/test/store.spec
 */

import { describe, expect, it } from 'vitest'
import { appendSample, historySchema } from '../src/store.ts'
import type { FastSnapshot } from '../src/model.ts'

function snapshot(): FastSnapshot {
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
  }
}

describe('appendSample', () => {
  it('appends to an absent history', () => {
    const history = appendSample(undefined, { at: 1, snapshot: snapshot() }, 20)
    expect(history.samples).toHaveLength(1)
    expect(history.samples[0]?.at).toBe(1)
  })

  it('caps the history at maxSamples, keeping the newest', () => {
    let history = appendSample(undefined, { at: 1, snapshot: snapshot() }, 2)
    history = appendSample(history, { at: 2, snapshot: snapshot() }, 2)
    history = appendSample(history, { at: 3, snapshot: snapshot() }, 2)
    expect(history.samples.map(sample => sample.at)).toEqual([2, 3])
  })
})

describe('historySchema', () => {
  it('accepts a valid history', () => {
    const parsed = historySchema.parse({ samples: [{ at: 1, snapshot: snapshot() }] })
    expect(parsed.samples).toHaveLength(1)
    expect(parsed.samples[0]?.snapshot.load.kind).toBe('open')
  })

  it('rejects a malformed history at the durable boundary', () => {
    expect(() => historySchema.parse({ samples: [{ at: 1, snapshot: { load: 'nope' } }] })).toThrow()
    expect(() => historySchema.parse({ samples: 'nope' })).toThrow()
  })

  it('accepts a nullable hit rate and load time', () => {
    const withNulls = snapshot()
    withNulls.load.timeToFirstRequestMs = null
    withNulls.cache.hitRate = null
    expect(() => historySchema.parse({ samples: [{ at: 1, snapshot: withNulls }] })).not.toThrow()
  })
})
