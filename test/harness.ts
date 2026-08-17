/**
 * Shared test harness: REAL Cordis `Context`, REAL `SessionStore`/`Session`,
 * the REAL storage seam (dsh-storage + dsh-storage-json backend + the
 * dsh-storage-domain facility) rooted in a per-mount temp directory, the REAL
 * commands and tools registries (SystemPrompt/ToolRuntime/CommandRuntime), and
 * the REAL `TokenMeter` from the 0.1.0-rc.6 peers. Nothing here is a
 * hand-written mock of a service.
 * @module dsh-fast/test/harness
 */

import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import SessionStore, { SessionId, type Session } from '@deepseek-ai/dsh-session'
import Storage from '@deepseek-ai/dsh-storage'
import { apply as jsonApply, Config as jsonConfig } from '@deepseek-ai/dsh-storage-json'
import { apply as domainApply, Config as domainConfig } from '@deepseek-ai/dsh-storage-domain'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import TokenMeter from '@deepseek-ai/dsh-token-meter'
import type { Agent } from '@deepseek-ai/dsh-agent'

/** Everything a mounted base hands back to a test. */
export interface BaseHarness {
  /** The mounting context (session store + storage domain + tools + commands + meter). */
  readonly ctx: Context
  /** A real session created on the mounted store. */
  readonly session: Session
  /** A minimal real-shaped agent pointing at the session (for scoped resolution). */
  readonly agent: Agent
  /** The storage backend root (owned by the caller; delete on teardown). */
  readonly root: string
}

/**
 * Mount the real services the plugin injects, plus a real session and a
 * minimal agent for scoped command/tool resolution. The storage backend is the
 * real JSON backend rooted in a fresh temp directory.
 * @param sessionId - session id to create (defaults to `fast-harness`).
 * @returns the mounted base.
 */
export async function mountBase(sessionId = 'fast-harness'): Promise<BaseHarness> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const session = ctx.sessions.create(SessionId(sessionId))
  await ctx.plugin(Storage)
  const root = await mkdtemp(path.join(tmpdir(), 'fast-test-'))
  await ctx.plugin({ apply: jsonApply, Config: jsonConfig, inject: ['storage'] }, { root })
  await ctx.plugin({ apply: domainApply, Config: domainConfig, inject: ['storage'] }, { backend: 'json' })
  await ctx.plugin(SystemPrompt, { persona: '' })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(TokenMeter)
  const agent = {
    session,
    status: 'idle',
    options: {},
    reserveTurnAdmission: () => () => undefined,
  } as unknown as Agent
  return { ctx, session, agent, root }
}

/** Remove the temp root a base was mounted on (only own mkdtemp dirs). */
export async function unmountBase(base: BaseHarness): Promise<void> {
  const expected = path.join(tmpdir(), 'fast-test-')
  if (!base.root.startsWith(expected)) throw new Error(`refusing to remove non-harness dir: ${base.root}`)
  await rm(base.root, { recursive: true, force: true })
}

/** A cast append that accepts any lossless-JSON event data (test fixtures). */
export type AppendAny = (type: string, data: unknown, opts?: { surfaceOp: 'append' }) => unknown

/** Append any event through a real Session, bypassing the typed surface (fixtures only). */
export function appendAny(session: Session): AppendAny {
  return session.append.bind(session) as unknown as AppendAny
}
