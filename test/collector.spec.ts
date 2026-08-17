/**
 * The session/event collector over a REAL `Session` from the 0.1.0-rc.6 peers:
 * load tracking, cache folding, compaction counting/trigger, spill detection,
 * and snapshot assembly. Only the optional token meter is supplied as a
 * scripted function; every session and event is real.
 * @module dsh-fast/test/collector.spec
 */

import { CallId } from '@deepseek-ai/dsh-llm'
import { createAssistantMessage, createToolResultMessage, createUserMessage } from '@deepseek-ai/dsh-llm/message'
import { Session, SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import {
  FastCollector,
  detectSpilledResult,
  flattenToolResultText,
  hitRateOf,
  sharesOf,
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

/** The standard happy path: load + spill + cache over one step. */
function happyPath(collector: FastCollector, session: Session): void {
  feed(collector, session, 'turn/start', { turn: 1 })
  feed(collector, session, 'user/message', createUserMessage({
    content: [{ type: 'text', text: 'hello' }],
    source: { kind: 'user' },
  }), true)
  feed(collector, session, 'step/start', { turn: 1, step: 1 })
  feed(collector, session, 'request/header', {
    header: { config: { provider: 'deepseek', model: 'deepseek-chat' }, system: 'You are a helpful assistant.' },
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
    expect(snapshot.context.systemTokens).toBeGreaterThan(0)
    expect(snapshot.context.surfaceTokens).toBe(300)
    expect(snapshot.context.totalTokens).toBe(1_000)
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

  it('computes shares and cache hit rate', () => {
    expect(sharesOf(1_000, 400, 200, 400)).toEqual({ systemShare: 0.4, toolsShare: 0.2, surfaceShare: 0.4 })
    expect(sharesOf(0, 0, 0, 0)).toEqual({ systemShare: 0, toolsShare: 0, surfaceShare: 0 })
    expect(hitRateOf(800, 200)).toBeCloseTo(0.2)
    expect(hitRateOf(0, 0)).toBeNull()
    expect(hitRateOf(100, 0)).toBe(0)
  })
})
