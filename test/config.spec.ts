/**
 * Config contract: the Schemastery schema fills defaults, and `resolveConfig`
 * fails loud on invalid bounds — never silently accepts a bad tunable.
 * @module dsh-fast/test/config.spec
 */

import { describe, expect, it } from 'vitest'
import { Config, resolveConfig } from '../src/config.ts'

describe('Config schema', () => {
  it('applies every default on an empty input', () => {
    const resolved = Config({})
    expect(resolved.enabled).toBe(true)
    expect(resolved.privacy?.includeCwd).toBe(false)
    expect(resolved.sampling?.snapshotIntervalMs).toBe(60_000)
    expect(resolved.thresholds?.systemPromptTokens).toBe(20_000)
    expect(resolved.thresholds?.toolSchemaTokens).toBe(8_000)
    expect(resolved.thresholds?.surfaceTokens).toBe(60_000)
    expect(resolved.thresholds?.cacheHitRateFloor).toBe(0.1)
    expect(resolved.thresholds?.compactionCountWarn).toBe(10)
    expect(resolved.thresholds?.compactionShadowTokens).toBe(40_000)
    expect(resolved.spill?.detectSpilledResults).toBe(true)
  })

  it('fills nested defaults of a partially configured object', () => {
    const resolved = Config({ thresholds: { surfaceTokens: 12_345 } })
    expect(resolved.thresholds?.surfaceTokens).toBe(12_345)
    expect(resolved.thresholds?.systemPromptTokens).toBe(20_000)
  })
})

describe('resolveConfig', () => {
  it('resolves a fully-populated config verbatim', () => {
    const resolved = resolveConfig({
      enabled: false,
      privacy: { includeCwd: true },
      sampling: { snapshotIntervalMs: 1_000 },
      thresholds: {
        systemPromptTokens: 1,
        toolSchemaTokens: 2,
        surfaceTokens: 3,
        cacheHitRateFloor: 0.5,
        compactionCountWarn: 4,
        compactionShadowTokens: 5,
      },
      spill: { detectSpilledResults: false },
    })
    expect(resolved.enabled).toBe(false)
    expect(resolved.includeCwd).toBe(true)
    expect(resolved.snapshotIntervalMs).toBe(1_000)
    expect(resolved.thresholds.systemPromptTokens).toBe(1)
    expect(resolved.thresholds.cacheHitRateFloor).toBe(0.5)
    expect(resolved.detectSpilledResults).toBe(false)
  })

  it('fails loud on a non-positive snapshot interval', () => {
    expect(() => resolveConfig({ sampling: { snapshotIntervalMs: 0 } })).toThrow(/snapshotIntervalMs/u)
    expect(() => resolveConfig({ sampling: { snapshotIntervalMs: -1 } })).toThrow(/snapshotIntervalMs/u)
  })

  it('fails loud on non-positive token thresholds', () => {
    expect(() => resolveConfig({ thresholds: { systemPromptTokens: 0 } })).toThrow(/systemPromptTokens/u)
    expect(() => resolveConfig({ thresholds: { compactionCountWarn: -1 } })).toThrow(/compactionCountWarn/u)
  })

  it('fails loud when the cache hit-rate floor leaves [0, 1]', () => {
    expect(() => resolveConfig({ thresholds: { cacheHitRateFloor: 1.5 } })).toThrow(/cacheHitRateFloor/u)
    expect(() => resolveConfig({ thresholds: { cacheHitRateFloor: -0.1 } })).toThrow(/cacheHitRateFloor/u)
  })
})
