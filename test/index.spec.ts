/**
 * The plugin assembly over the REAL host seams (SessionStore, storage domain,
 * SystemPrompt, ToolRuntime, CommandRuntime, TokenMeter): command + tool
 * registration, the `/fast` execution path, and inert mounting when disabled.
 * @module dsh-fast/test/index.spec
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
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

// ---------------------------------------------------------------------------
// P1 invariant: every degradation decision is explicit, visible, and pinned
// ---------------------------------------------------------------------------

describe('degradation invariants', () => {
  it('degrades visibly on a host without a token meter: the report still serves with heuristic buckets', async () => {
    // A host with no tokenMeter: the documented heuristic fallback is taken.
    // The report must still serve (never a hard failure) and must label the
    // numbers as heuristic. (`systemPrompt` is deliberately NOT omitted here:
    // ToolRuntime injects it, so a host without it mounts no `tools` service at
    // all and this plugin stays pending — the systemPrompt branch is defensive
    // only.) The once-per-key warning behaviour is pinned in notices.spec.ts.
    const base = await mountBase('index-degradation', { withTokenMeter: false })
    bases.push(base)
    await mountPlugin(base)
    // The collector only tracks sessions created while the plugin is mounted.
    const live = base.ctx.sessions.create(SessionId('index-degradation-live'))
    const agent = { session: live, status: 'idle', options: {}, reserveTurnAdmission: () => () => undefined } as unknown as Agent
    const execution = await base.ctx.commands.execute(agent, '/fast', [], new AbortController().signal)
    expect(execution?.result.kind).toBe('success')
    const text = String((execution?.result as { text?: string } | undefined)?.text ?? '')
    expect(text).toContain('dsh-fast')
    expect(text.toLowerCase()).toContain('heuristic')
  })

  it('always reports spill detection as a documented heuristic, never a hard signal', async () => {
    const base = await mountBase('index-heuristic-invariant')
    bases.push(base)
    await mountPlugin(base)
    const execution = await base.ctx.commands.execute(base.agent, '/fast', [], new AbortController().signal)
    expect(execution?.result.kind).toBe('success')
    // The rendered report labels the spill counter as heuristic in the same
    // breath as the number, so a zero can never be read as "proven clean".
    expect(String((execution?.result as { text?: string }).text ?? '')).toMatch(/heuristic/i)
  })
})
