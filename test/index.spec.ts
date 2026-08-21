/**
 * The plugin assembly over the REAL host seams (SessionStore, storage domain,
 * SystemPrompt, ToolRuntime, CommandRuntime, TokenMeter): command + tool
 * registration, the `/fast` execution path, and inert mounting when disabled.
 * @module dsh-fast/test/index.spec
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountBase, unmountBase, type BaseHarness } from './harness.ts'

const fibers: Array<{ dispose(): Promise<void> }> = []
const bases: BaseHarness[] = []
afterEach(async () => {
  await Promise.all(fibers.splice(0).map(fiber => fiber.dispose()))
  await Promise.all(bases.splice(0).map(base => unmountBase(base)))
  vi.unstubAllGlobals()
})

/** Mount the plugin on a harness context. */
async function mountPlugin(base: BaseHarness, config: Record<string, unknown> = {}) {
  const plugin = await import('../src/index.ts')
  const fiber = await base.ctx.plugin(plugin as never, config as never)
  fibers.push(fiber)
  return fiber
}

describe('apply', () => {
  it('registers the /fast command and the fast_report tool', async () => {
    const base = await mountBase('index-register')
    bases.push(base)
    await mountPlugin(base)
    expect(base.ctx.tools.get('fast_report')).toBeDefined()
    expect(base.ctx.commands.find(base.agent, 'fast')?.name).toBe('fast')
  })

  it('serves /fast with a report', async () => {
    const base = await mountBase('index-command')
    bases.push(base)
    await mountPlugin(base)
    const execution = await base.ctx.commands.execute(base.agent, '/fast', [], new AbortController().signal)
    expect(execution).toBeDefined()
    expect(execution?.result.kind).toBe('success')
    if (execution?.result.kind === 'success') {
      expect(execution.result.text ?? '').toContain('dsh-fast')
    }
  })

  it('stays inert when disabled', async () => {
    const base = await mountBase('index-disabled')
    bases.push(base)
    await mountPlugin(base, { enabled: false })
    expect(base.ctx.tools.get('fast_report')).toBeUndefined()
    expect(base.ctx.commands.find(base.agent, 'fast')).toBeUndefined()
  })
})
