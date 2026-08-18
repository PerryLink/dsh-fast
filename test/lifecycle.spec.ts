/**
 * Lifecycle and export-contract suite: the HMR-safety test (dispose the
 * contributing fiber, re-query the authoritative command/tool registries, and
 * confirm the sampling timer is owned by the plugin effect), and the
 * default-export guard (module namespace + Loader unwrap round-trip).
 * @module dsh-fast/test/lifecycle.spec
 */

import Loader from '@deepseek-ai/cordis-plugin-loader'
import { describe, expect, it, vi } from 'vitest'
import * as plugin from '../src/index.ts'
import { mountBase, unmountBase } from './harness.ts'

// ---------------------------------------------------------------------------
// C2: the function-plugin namespace must survive Loader unwrapping
// ---------------------------------------------------------------------------

describe('export contract', () => {
  it('carries no default export and Loader unwrap round-trips the namespace', () => {
    expect('default' in plugin).toBe(false)
    const unwrapped = Object.create(Loader.prototype).unwrapExports(plugin)
    expect(unwrapped).toBe(plugin)
    expect(unwrapped.name).toBe('fast')
    expect(unwrapped.inject).toEqual(['commands', 'tools', 'storageDomain'])
    expect(unwrapped.Config).not.toBeUndefined()
    expect(typeof unwrapped.apply).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// C1: disposing the contributing fiber removes every registry contribution
// ---------------------------------------------------------------------------

describe('fiber disposal', () => {
  it('removes the /fast command and fast_report tool when its fiber is disposed', async () => {
    const base = await mountBase('lifecycle-dispose')
    try {
      const fiber = await base.ctx.plugin(plugin as never, {} as never)
      expect(base.ctx.tools.get('fast_report')).toBeDefined()
      expect(base.ctx.commands.find(base.agent, 'fast')).toBeDefined()

      await fiber.dispose()

      expect(base.ctx.tools.get('fast_report')).toBeUndefined()
      expect(base.ctx.commands.find(base.agent, 'fast')).toBeUndefined()
    } finally {
      await unmountBase(base)
    }
  })

  it('owns the sampling timer and clears it when its fiber is disposed', async () => {
    vi.useFakeTimers()
    try {
      const base = await mountBase('lifecycle-timer')
      try {
        const fiber = await base.ctx.plugin(plugin as never, {} as never)
        // The ctx.effect registered one interval; no other timers are pending.
        expect(vi.getTimerCount()).toBeGreaterThan(0)

        await fiber.dispose()
        // The effect disposer cleared the interval it owned.
        expect(vi.getTimerCount()).toBe(0)
      } finally {
        await unmountBase(base)
      }
    } finally {
      vi.useRealTimers()
    }
  })
})
