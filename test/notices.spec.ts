/**
 * The one-time degradation notifier: the invariant behind every "fallback is
 * visible once, never per sample" promise in the plugin (missing token meter,
 * missing system-prompt service, failing inspector outlet).
 * @module dsh-fast/test/notices.spec
 */

import { describe, expect, it, vi } from 'vitest'
import { createOnceNotifier } from '../src/notices.ts'

describe('createOnceNotifier', () => {
  it('forwards the first message per key and swallows repeats', () => {
    const sink = vi.fn()
    const notify = createOnceNotifier(sink)
    notify('tokenMeter', 'tokenMeter is not composed: heuristic pricing')
    notify('tokenMeter', 'tokenMeter is not composed: heuristic pricing')
    notify('tokenMeter', 'a different message under the same key')
    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink).toHaveBeenCalledWith('tokenMeter is not composed: heuristic pricing')
  })

  it('keeps keys independent', () => {
    const sink = vi.fn()
    const notify = createOnceNotifier(sink)
    notify('tokenMeter', 'meter fallback')
    notify('systemPrompt', 'prompt fallback')
    notify('inspector', 'outlet failure')
    notify('tokenMeter', 'meter fallback again')
    expect(sink.mock.calls.map(call => call[0])).toEqual(['meter fallback', 'prompt fallback', 'outlet failure'])
  })
})
