/**
 * The fixed heuristic estimator mirrors the token-meter vocabulary:
 * `ceil(chars / 4)` plus framing overhead. These are protocol constants.
 * @module dsh-fast/test/estimate.spec
 */

import { describe, expect, it } from 'vitest'
import type { EpochHeader } from '@deepseek-ai/dsh-session'
import { estimateSystemTokens, estimateToolsTokens } from '../src/estimate.ts'

describe('estimateSystemTokens', () => {
  it('returns 0 when the header or system prompt is absent', () => {
    expect(estimateSystemTokens(undefined)).toBe(0)
    expect(estimateSystemTokens({ config: { provider: 'p', model: 'm' } })).toBe(0)
  })

  it('prices a system prompt at ceil(chars/4) + framing overhead', () => {
    const system = 'You are a helpful assistant.'
    expect(estimateSystemTokens({ config: { provider: 'p', model: 'm' }, system }))
      .toBe(Math.ceil(system.length / 4) + 4)
  })
})

describe('estimateToolsTokens', () => {
  it('returns 0 when tools are absent or empty', () => {
    expect(estimateToolsTokens(undefined)).toBe(0)
    expect(estimateToolsTokens({ config: { provider: 'p', model: 'm' }, tools: [] })).toBe(0)
  })

  it('prices the serialized tool schema plus block overhead', () => {
    const tools = [{ name: 'read_file', description: 'Read a file' }]
    const header = { config: { provider: 'p', model: 'm' }, tools } as unknown as EpochHeader
    expect(estimateToolsTokens(header))
      .toBe(Math.ceil(JSON.stringify(tools).length / 4) + 4)
  })
})
