/**
 * The session/event collector over a REAL `Session` from the 0.1.7-rc.2
 * peers: load tracking, cache folding, compaction counting/trigger, spill
 * detection, system-prompt accounting, and snapshot assembly. Only the optional
 * token meter is supplied as a scripted function; every session and event is real.
 * On the 0.1.7 line `createSystemMessage` takes the rendered prompt alone: the
 * removed second argument used to carry the assembling plugin's name.
 * @module dsh-fast/test/collector.spec
 */

import { createAssistantMessage, createSystemMessage, createToolResultMessage, createUserMessage } from '@deepseek-ai/dsh-llm/message'
import { Session, SessionId, type SessionEvent, type ToolResultMessage } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import { CallId } from './call-id.ts'
import {
  FastCollector,
  detectSpilledResult,
  flattenToolResultText,
  hitRateOf,
  sharesOf,
  surfaceEventsOf,
} from '../src/collector.ts'
import { resolveConfig } from '../src/config.ts'
import { appendAny } from './harness.ts'

/** Append one real event and feed it to the collector. */
function feed(
  collector: FastCollector,
  session: Session,
  type: string,
  data: unknown,
  surface = false,
): void {
  const event = appendAny(session)(type, data, surface ? { surfaceOp: 'append' } : undefined) as SessionEvent
  collector.handleEvent(session, event)
}

/** The rendered prompt the fixtures append as surface node 0 (0.1.5-alpha.1). */
const SYSTEM_TEXT = 'You are a helpful assistant.'

/** The standard happy path: load + spill + cache over one step. */
function happyPath(collector: FastCollector, session: Session): void {
  feed(collector, session, 'turn/start', { turn: 1 })
  feed(collector, session, 'step/start', { turn: 1, step: 1 })
  feed(collector, session, 'system/message', {
    turn: 1,
    step: 1,
    message: createSystemMessage(SYSTEM_TEXT),
  }, true)
  feed(collector, session, 'user/message', createUserMessage({
    content: [{ type: 'text', text: 'hello' }],
    source: { kind: 'user' },
  }), true)
  feed(collector, session, 'request/header', {
    header: { config: { provider: 'deepseek', model: 'deepseek-chat' } },
    reason: 'initial',
  })
  feed(collector, session, 'tool/call', { turn: 1, step: 1, callId: CallId('c1'), name: 'bash', arguments: '{}' })
  feed(collector, session, 'tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({
      callId: CallId('c1'),
      content: [{ type: 'text', text: 'Full formatted result stored at: /spill/bash.txt. Use read.' }],
      isError: false,
    }),
  }, true)
  feed(collector, session, 'assistant/message', {
    turn: 1,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text: 'done' }],
      source: { provider: 'deepseek', model: 'deepseek-chat' },
    }),
    usage: { inputTokens: 800, outputTokens: 100, cacheReadTokens: 200, cacheWriteTokens: 50 },
  }, true)
  feed(collector, session, 'step/end', { turn: 1, step: 1 })
  feed(collector, session, 'turn/end', { turn: 1, reason: { kind: 'completed' } })
}

describe('collector load, spill, and cache', () => {
  it('tracks load, detects a spilled result, and folds cache usage', () => {
    const session = Session.create(SessionId('collector-happy'))
    const collector = new FastCollector(resolveConfig({}))
    collector.handleSessionCreated(session)
    happyPath(collector, session)

    const snapshot = collector.snapshot(session, () => ({ totalTokens: 1_000, surfaceTokens: 300 }))
    expect(snapshot.load.kind).toBe('open')
    expect(snapshot.load.seedEvents).toBe(0)
    expect(snapshot.load.timeToFirstRequestMs).not.toBeNull()
    expect(snapshot.spill.detectedSpilledResults).toBe(1)
    expect(snapshot.cache.inputTokens).toBe(800)
    expect(snapshot.cache.cacheReadTokens).toBe(200)
    expect(snapshot.cache.cacheWriteTokens).toBe(50)
    expect(snapshot.cache.outputTokens).toBe(100)
    expect(snapshot.cache.hitRate).toBeCloseTo(0.2)
    expect(snapshot.context.systemTokens).toBe(Math.ceil(SYSTEM_TEXT.length / 4) + 4)
    // 0.1.5-alpha.1 prices the system prompt into the meter surface; dsh-fast subtracts it.
    expect(snapshot.context.surfaceTokens).toBe(300 - snapshot.context.systemTokens)
    expect(snapshot.context.systemBreakdown.other.chars).toBe(SYSTEM_TEXT.length)
    expect(snapshot.context.totalTokens).toBe(1_000)
  })
})

describe('collector system-prompt accounting (A2 surface-read migration)', () => {
  it('reports byte-identical metrics through the async surface read and the sync fallback', () => {
    // Golden comparison for the P0-1 migration: the deprecated
    // `Session.eventAt(seq)` read is gone, so the two remaining paths — the
    // `sessionQuery.readSurface` events the plugin passes in, and the
    // collector's own synchronous fallback — must agree on every metric for
    // one and the same log.
    const session = Session.create(SessionId('collector-surface-parity'))
    const collector = new FastCollector(resolveConfig({}))
    collector.handleSessionCreated(session)
    happyPath(collector, session)
    feed(collector, session, 'system/message', {
      turn: 1,
      step: 2,
      message: createSystemMessage(''),
    }, true)

    const measure = (): { totalTokens: number; surfaceTokens: number } => ({ totalTokens: 1_000, surfaceTokens: 300 })
    const viaFallback = collector.snapshot(session, measure)
    const viaQuery = collector.snapshot(session, measure, undefined, surfaceEventsOf(session))
    expect(viaQuery).toEqual(viaFallback)
    // The surface read carries the prompt node, so the system bucket is priced.
    expect(viaFallback.context.systemTokens).toBeGreaterThan(0)
    expect(viaFallback.context.systemBreakdown.other.chars).toBe(SYSTEM_TEXT.length)
  })

  it('takes the supplied surface over the session fallback when they differ', () => {
    // Proves the new parameter is really consumed rather than silently ignored.
    const session = Session.create(SessionId('collector-surface-precedence'))
    const collector = new FastCollector(resolveConfig({}))
    collector.handleSessionCreated(session)
    happyPath(collector, session)

    const injected = 'A completely different prompt body.'
    const injectedEvents = [
      ...surfaceEventsOf(session).filter(event => event.type !== 'system/message'),
      {
        type: 'system/message',
        seq: 900,
        time: 0,
        data: { turn: 9, step: 9, message: createSystemMessage(injected) },
      },
    ] as unknown as readonly SessionEvent[]
    const snapshot = collector.snapshot(session, () => ({ totalTokens: 1_000, surfaceTokens: 300 }), undefined, injectedEvents)
    expect(snapshot.context.systemBreakdown.other.chars).toBe(injected.length)
  })
})

describe('collector system-prompt accounting', () => {
  it('leaves the meter surface untouched when no system node exists', () => {
    const session = Session.create(SessionId('collector-no-system'))
    const collector = new FastCollector(resolveConfig({}))
    collector.handleSessionCreated(session)
    feed(collector, session, 'turn/start', { turn: 1 })
    feed(collector, session, 'user/message', createUserMessage({
      content: [{ type: 'text', text: 'hello' }],
      source: { kind: 'user' },
    }), true)

    const snapshot = collector.snapshot(session, () => ({ totalTokens: 500, surfaceTokens: 300 }))
    expect(snapshot.context.systemTokens).toBe(0)
    expect(snapshot.context.surfaceTokens).toBe(300)
    expect(snapshot.context.totalTokens).toBe(500)
  })

  it('ignores a dormant empty system node and prices the last non-empty one', () => {
    const session = Session.create(SessionId('collector-dormant-system'))
    const collector = new FastCollector(resolveConfig({}))
    collector.handleSessionCreated(session)
    feed(collector, session, 'turn/start', { turn: 1 })
    feed(collector, session, 'step/start', { turn: 1, step: 1 })
    feed(collector, session, 'system/message', {
      turn: 1,
      step: 1,
      message: createSystemMessage(SYSTEM_TEXT),
    }, true)
    feed(collector, session, 'system/message', {
      turn: 1,
      step: 1,
      message: createSystemMessage(''),
    }, true)

    const snapshot = collector.snapshot(session, () => ({ totalTokens: 500, surfaceTokens: 300 }))
    expect(snapshot.context.systemTokens).toBe(Math.ceil(SYSTEM_TEXT.length / 4) + 4)
    expect(snapshot.context.surfaceTokens).toBe(300 - snapshot.context.systemTokens)
  })

  it('falls back to the legacy header.system string when no system node exists', () => {
    const session = Session.create(SessionId('collector-legacy-system'))
    const collector = new FastCollector(resolveConfig({}))
    collector.handleSessionCreated(session)
    // A 0.1.2/0.1.3 host still carries the prompt in the request envelope; feed
    // the fold directly because 0.1.5-alpha.1 refuses header.system at append.
    collector.handleEvent(session, {
      type: 'request/header',
      time: 1_000,
      data: { header: { config: { provider: 'p', model: 'm' }, system: SYSTEM_TEXT } },
    } as unknown as SessionEvent)

    const snapshot = collector.snapshot(session, () => ({ totalTokens: 500, surfaceTokens: 300 }))
    expect(snapshot.context.systemTokens).toBe(Math.ceil(SYSTEM_TEXT.length / 4) + 4)
    // The legacy meter surface never contained the prompt: no deduction.
    expect(snapshot.context.surfaceTokens).toBe(300)
    expect(snapshot.context.systemBreakdown.other.chars).toBe(SYSTEM_TEXT.length)
  })
})

describe('collector compaction', () => {
  it('counts compactions and attributes manual vs automatic trigger', () => {
    const session = Session.create(SessionId('collector-compaction'))
    const collector = new FastCollector(resolveConfig({}))
    collector.handleSessionCreated(session)

    feed(collector, session, 'compaction/start', { compactionId: 'c1', sourceCommandId: 'cmd-1', turn: 1 })
    feed(collector, session, 'compaction/summary', { compactionId: 'c1', shadowedTokenCount: 12_000, shadowedSeqs: [], shadowedRange: { start: 1, end: 2 }, summary: [], provider: 'p', model: 'm' })
    feed(collector, session, 'compaction/end', { compactionId: 'c1', turn: 1 })
    feed(collector, session, 'compaction/start', { compactionId: 'c2', turn: 2 })
    feed(collector, session, 'compaction/end', { compactionId: 'c2', turn: 2, error: 'failed' })

    const snapshot = collector.snapshot(session)
    expect(snapshot.compaction.count).toBe(2)
    expect(snapshot.compaction.manual).toBe(1)
    expect(snapshot.compaction.automatic).toBe(1)
    expect(snapshot.compaction.shadowedTokens).toBe(12_000)
  })
})

describe('collector load record', () => {
  it('classifies a seeded session as restore and records time-to-first-request', () => {
    const seed = [
      { type: 'turn/start', seq: 0, time: 1_000, data: { turn: 1 } },
      { type: 'turn/end', seq: 1, time: 2_000, data: { turn: 1, reason: { kind: 'completed' } } },
    ]
    const session = Session.create(SessionId('collector-restore'), seed as never)
    const collector = new FastCollector(resolveConfig({}))
    collector.handleSessionCreated(session)

    expect(collector.snapshot(session).load).toMatchObject({ kind: 'restore', seedEvents: 2, timeToFirstRequestMs: null })

    feed(collector, session, 'request/header', {
      header: { config: { provider: 'p', model: 'm' } },
      reason: 'initial',
    })
    const load = collector.snapshot(session).load
    expect(load.kind).toBe('restore')
    expect(load.seedEvents).toBe(2)
    expect(typeof load.timeToFirstRequestMs).toBe('number')
  })

  it('drops a disposed session and marks/clears the dirty flag', () => {
    const session = Session.create(SessionId('collector-dirty'))
    const collector = new FastCollector(resolveConfig({}))
    collector.handleSessionCreated(session)
    expect(collector.isDirty(session)).toBe(true)
    collector.markClean(session)
    expect(collector.isDirty(session)).toBe(false)
    collector.handleSessionDisposed(session)
    expect(collector.has(session)).toBe(false)
    expect([...collector.liveSessions()]).toHaveLength(0)
  })
})

describe('pure helpers', () => {
  it('detects a spilled tool result from the durable notice', () => {
    const spilled = createToolResultMessage({
      callId: CallId('c1'),
      content: [{ type: 'text', text: 'Full formatted result stored at: /spill/x.txt. Use read.' }],
      isError: false,
    })
    const plain = createToolResultMessage({
      callId: CallId('c2'),
      content: [{ type: 'text', text: 'just a normal result' }],
      isError: false,
    })
    expect(detectSpilledResult(spilled)).toBe(true)
    expect(detectSpilledResult(plain)).toBe(false)
  })

  it('flattens a tool result to its text', () => {
    const message = createToolResultMessage({
      callId: CallId('c1'),
      content: [{ type: 'text', text: 'alpha' }, { type: 'text', text: 'beta' }],
      isError: false,
    })
    expect(flattenToolResultText(message)).toBe('alphabeta')
  })

  it('still reads the released V3 wrapper tool-result shape', () => {
    // Through 0.1.6 a tool result travelled as ONE `tool-result` block whose own
    // `content` held the model-facing blocks; session format V4 (the 0.1.7 line)
    // lifted it to a first-class tool-role message with the blocks inline. The
    // structural read has to cover both, because the peer range still admits the
    // older lines at runtime.
    const wrapped = {
      ...createToolResultMessage({ callId: CallId('c1'), content: [], isError: false }),
      content: [{
        type: 'tool-result',
        toolCallId: CallId('c1'),
        content: [{ type: 'text', text: 'gamma' }, { type: 'text', text: 'delta' }],
        isError: false,
      }],
    } as unknown as ToolResultMessage
    expect(flattenToolResultText(wrapped)).toBe('gammadelta')
    expect(detectSpilledResult(wrapped)).toBe(false)
  })

  it('computes shares and cache hit rate', () => {
    expect(sharesOf(1_000, 400, 200, 400)).toEqual({ systemShare: 0.4, toolsShare: 0.2, surfaceShare: 0.4 })
    expect(sharesOf(0, 0, 0, 0)).toEqual({ systemShare: 0, toolsShare: 0, surfaceShare: 0 })
    expect(hitRateOf(800, 200)).toBeCloseTo(0.2)
    expect(hitRateOf(0, 0)).toBeNull()
    expect(hitRateOf(100, 0)).toBe(0)
  })
})
