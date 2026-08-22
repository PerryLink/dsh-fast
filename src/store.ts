/**
 * Durable metric storage over the harness storage domain. The `dsh-fast`
 * domain keeps one bounded history per session, so `/fast` and `fast_report`
 * metrics survive a restart and the trend stays queryable without touching the
 * session log (the rc.2 `Session.append` offers no `ignorable` marker and no
 * external event-registration surface, so a custom session event would make
 * the persistence coordinator refuse the log on restore).
 * @module dsh-fast/store
 */

import z from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { FastSnapshot, StoredSample } from './model.ts'

/** Zod schema for the load section. */
const loadSchema = z.object({
  kind: z.enum(['open', 'restore']),
  seedEvents: z.number().int().nonnegative(),
  timeToFirstRequestMs: z.number().int().nonnegative().nullable(),
})

/** Zod schema for the spill section. */
const spillSchema = z.object({
  detectedSpilledResults: z.number().int().nonnegative(),
  heuristic: z.boolean(),
})

/** Zod schema for the compaction section. */
const compactionSchema = z.object({
  count: z.number().int().nonnegative(),
  manual: z.number().int().nonnegative(),
  automatic: z.number().int().nonnegative(),
  shadowedTokens: z.number().int().nonnegative(),
})

/** Zod schema for the context section. */
const contextSchema = z.object({
  totalTokens: z.number().nonnegative(),
  systemTokens: z.number().nonnegative(),
  toolSchemaTokens: z.number().nonnegative(),
  surfaceTokens: z.number().nonnegative(),
  systemShare: z.number(),
  toolsShare: z.number(),
  surfaceShare: z.number(),
})

/** Zod schema for the cache section. */
const cacheSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  hitRate: z.number().nullable(),
})

/** Zod schema for one {@link FastSnapshot}. */
const snapshotSchema = z.object({
  load: loadSchema,
  spill: spillSchema,
  compaction: compactionSchema,
  context: contextSchema,
  cache: cacheSchema,
})

/** Zod schema for one {@link StoredSample}. */
const sampleSchema = z.object({
  at: z.number().int().nonnegative(),
  snapshot: snapshotSchema,
})

/** The per-session value: a bounded history of samples. */
export const historySchema = z.object({
  samples: z.array(sampleSchema),
})

/** The per-session history value type. */
export interface HistoryValue {
  samples: StoredSample[]
}

/** The `dsh-fast` storage-domain declaration. */
export const fastDomainSpec = defineDomain({
  name: 'dsh_fast',
  version: 1,
  tables: {
    sessions: domainTable<string, HistoryValue>(historySchema),
  },
})

/**
 * Append one snapshot to a history, keeping only the newest `maxSamples`.
 * @param history - the current history (may be absent).
 * @param sample - the sample to append.
 * @param maxSamples - the bounded length.
 * @returns the new history.
 */
export function appendSample(history: HistoryValue | undefined, sample: StoredSample, maxSamples: number): HistoryValue {
  const samples = [...(history?.samples ?? []), sample]
  return { samples: samples.slice(-maxSamples) }
}
