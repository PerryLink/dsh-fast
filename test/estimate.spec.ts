/**
 * The fixed heuristic estimator mirrors the token-meter vocabulary:
 * `ceil(chars / 4)` plus framing overhead. These are protocol constants.
 * @module dsh-fast/test/estimate.spec
 */

import { createSystemMessage } from '@deepseek-ai/dsh-llm/message'
import { describe, expect, it } from 'vitest'
import type { EpochHeader } from '@deepseek-ai/dsh-session'
import {
  classifySystemSections,
  estimateLegacySystemTokens,
  estimateSystemTokens,
  estimateToolsTokens,
} from '../src/estimate.ts'

describe('estimateSystemTokens', () => {
  it('returns 0 when the system message is absent or its content is empty', () => {
    expect(estimateSystemTokens(undefined)).toBe(0)
    expect(estimateSystemTokens(createSystemMessage('', 'test'))).toBe(0)
  })

  it('prices a system message at ceil(chars/4) + framing overhead', () => {
    const system = 'You are a helpful assistant.'
    expect(estimateSystemTokens(createSystemMessage(system, 'test')))
      .toBe(Math.ceil(system.length / 4) + 4)
  })
})

describe('estimateLegacySystemTokens', () => {
  it('keeps pricing the pre-0.1.5 header.system string for the old peer line', () => {
    expect(estimateLegacySystemTokens(undefined)).toBe(0)
    const system = 'You are a helpful assistant.'
    expect(estimateLegacySystemTokens(system)).toBe(Math.ceil(system.length / 4) + 4)
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

describe('classifySystemSections', () => {
  it('splits named sections into the persona/skills/agents/other buckets with shares', () => {
    const breakdown = classifySystemSections([
      { name: 'harness:identity', text: 'Identity: DeepSeek Harness.' },
      { name: 'deployment:persona', text: 'You are precise.' },
      { name: 'skill:read-file', text: 'Use read_file for files.' },
      { name: 'agent-instructions', text: 'Follow AGENTS.md.' },
      { name: 'tool:bash', text: 'Use bash carefully.' },
    ])
    expect(breakdown.persona.chars).toBe('You are precise.'.length)
    expect(breakdown.persona.tokens).toBe(Math.ceil('You are precise.'.length / 4))
    expect(breakdown.skills.chars).toBe('Use read_file for files.'.length)
    expect(breakdown.agentsMd.chars).toBe('Follow AGENTS.md.'.length)
    expect(breakdown.other.chars).toBe('Identity: DeepSeek Harness.'.length + 'Use bash carefully.'.length)
    const total = breakdown.persona.tokens + breakdown.skills.tokens + breakdown.agentsMd.tokens + breakdown.other.tokens
    expect(breakdown.persona.share + breakdown.skills.share + breakdown.agentsMd.share + breakdown.other.share).toBeCloseTo(1)
    expect(breakdown.persona.share).toBeCloseTo(breakdown.persona.tokens / total)
  })

  it('returns all-zero buckets for an empty section list', () => {
    expect(classifySystemSections([])).toEqual({
      agentsMd: { tokens: 0, chars: 0, share: 0 },
      skills: { tokens: 0, chars: 0, share: 0 },
      persona: { tokens: 0, chars: 0, share: 0 },
      other: { tokens: 0, chars: 0, share: 0 },
    })
  })

  it('attributes an unclassified section (e.g. a bare rendered prompt) to other', () => {
    const breakdown = classifySystemSections([{ name: 'other', text: 'rendered prompt text' }])
    expect(breakdown.other.chars).toBe('rendered prompt text'.length)
    expect(breakdown.other.share).toBe(1)
    expect(breakdown.persona.tokens).toBe(0)
  })
})
