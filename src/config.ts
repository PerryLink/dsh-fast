/**
 * Config schema and resolution for `dsh-fast`. Every tunable is a validated
 * {@link Config} field changeable from cordis.yml; the resolution step
 * validates numeric bounds so misconfiguration fails loud at mount. The plugin
 * is read-only and safe, so it defaults to enabled — but `enabled: false`
 * mounts nothing.
 * @module dsh-fast/config
 */

import z from '@deepseek-ai/schemastery'

/** Privacy switches for the report surfaces. */
export interface PrivacyConfig {
  /** Include the sanitized session working directory in `/fast` and `fast_report`. Off by default: a local path is sensitive. */
  includeCwd?: boolean
}

/** Async sampling policy (off the model path). */
export interface SamplingConfig {
  /** How often active sessions are sampled, in milliseconds. */
  snapshotIntervalMs?: number
  /** How many samples to retain per session in the durable domain history. */
  maxHistorySamples?: number
}

/** Suggestion thresholds — the values that decide which optimization notes appear. */
export interface ThresholdConfig {
  /** Warn when assembled system-prompt tokens (AGENTS.md + skills + persona) exceed this. */
  systemPromptTokens?: number
  /** Warn when tool-schema tokens exceed this. */
  toolSchemaTokens?: number
  /** Warn when conversation-surface tokens exceed this. */
  surfaceTokens?: number
  /** Warn when the LLM cache hit rate falls below this (0..1). */
  cacheHitRateFloor?: number
  /** Warn once the session has triggered this many compactions. */
  compactionCountWarn?: number
  /** Warn when the average shadowed token count per completed summary exceeds this. */
  compactionShadowTokens?: number
}

/** Spill-detection switch. */
export interface SpillConfig {
  /** Detect spilled tool results from the durable spill-notice marker. Best-effort; see README "Known limitations". */
  detectSpilledResults?: boolean
}

/** Raw plugin config — every field optional; {@link resolveConfig} supplies the defaults. */
export interface Config {
  /** Master switch. Off by default? No — diagnostics are read-only and safe, so on by default. */
  enabled?: boolean
  privacy?: PrivacyConfig
  sampling?: SamplingConfig
  thresholds?: ThresholdConfig
  spill?: SpillConfig
}

/** Fully resolved config handed to the runtime. */
export interface ResolvedConfig {
  readonly enabled: boolean
  readonly includeCwd: boolean
  readonly snapshotIntervalMs: number
  readonly maxHistorySamples: number
  readonly detectSpilledResults: boolean
  readonly thresholds: {
    readonly systemPromptTokens: number
    readonly toolSchemaTokens: number
    readonly surfaceTokens: number
    readonly cacheHitRateFloor: number
    readonly compactionCountWarn: number
    readonly compactionShadowTokens: number
  }
}

/** Schemastery schema: the loader validates and fills defaults before `apply`. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  privacy: z.object({
    includeCwd: z.boolean().default(false),
  }).default({ includeCwd: false }),
  sampling: z.object({
    snapshotIntervalMs: z.number().default(60_000),
    maxHistorySamples: z.number().default(20),
  }).default({ snapshotIntervalMs: 60_000, maxHistorySamples: 20 }),
  thresholds: z.object({
    systemPromptTokens: z.number().default(20_000),
    toolSchemaTokens: z.number().default(8_000),
    surfaceTokens: z.number().default(60_000),
    cacheHitRateFloor: z.number().default(0.1),
    compactionCountWarn: z.number().default(10),
    compactionShadowTokens: z.number().default(40_000),
  }).default({
    systemPromptTokens: 20_000,
    toolSchemaTokens: 8_000,
    surfaceTokens: 60_000,
    cacheHitRateFloor: 0.1,
    compactionCountWarn: 10,
    compactionShadowTokens: 40_000,
  }),
  spill: z.object({
    detectSpilledResults: z.boolean().default(true),
  }).default({ detectSpilledResults: true }),
})

/** Throw unless `value` is a positive safe integer. */
function assertPositiveInt(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer, got ${String(value)}`)
  }
}

/** Throw unless `value` is a finite number in `[min, max]`. */
function assertFiniteRange(name: string, value: number, min: number, max: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new TypeError(`${name} must be a finite number in [${min}, ${max}], got ${String(value)}`)
  }
}

/**
 * Validate raw values and fill explicit defaults. Invalid bounds throw here —
 * misconfiguration fails loud at mount even without the Schemastery loader.
 * @param config - raw (possibly partial) plugin config.
 * @returns the fully resolved config.
 */
export function resolveConfig(config: Config = {}): ResolvedConfig {
  const samplingRaw = config.sampling ?? {}
  const thresholdsRaw = config.thresholds ?? {}
  const spillRaw = config.spill ?? {}

  const snapshotIntervalMs = samplingRaw.snapshotIntervalMs ?? 60_000
  assertPositiveInt('sampling.snapshotIntervalMs', snapshotIntervalMs)
  const maxHistorySamples = samplingRaw.maxHistorySamples ?? 20
  assertPositiveInt('sampling.maxHistorySamples', maxHistorySamples)

  const systemPromptTokens = thresholdsRaw.systemPromptTokens ?? 20_000
  const toolSchemaTokens = thresholdsRaw.toolSchemaTokens ?? 8_000
  const surfaceTokens = thresholdsRaw.surfaceTokens ?? 60_000
  const cacheHitRateFloor = thresholdsRaw.cacheHitRateFloor ?? 0.1
  const compactionCountWarn = thresholdsRaw.compactionCountWarn ?? 10
  const compactionShadowTokens = thresholdsRaw.compactionShadowTokens ?? 40_000
  assertPositiveInt('thresholds.systemPromptTokens', systemPromptTokens)
  assertPositiveInt('thresholds.toolSchemaTokens', toolSchemaTokens)
  assertPositiveInt('thresholds.surfaceTokens', surfaceTokens)
  assertFiniteRange('thresholds.cacheHitRateFloor', cacheHitRateFloor, 0, 1)
  assertPositiveInt('thresholds.compactionCountWarn', compactionCountWarn)
  assertPositiveInt('thresholds.compactionShadowTokens', compactionShadowTokens)

  return {
    enabled: config.enabled ?? true,
    includeCwd: config.privacy?.includeCwd ?? false,
    snapshotIntervalMs,
    maxHistorySamples,
    detectSpilledResults: spillRaw.detectSpilledResults ?? true,
    thresholds: {
      systemPromptTokens,
      toolSchemaTokens,
      surfaceTokens,
      cacheHitRateFloor,
      compactionCountWarn,
      compactionShadowTokens,
    },
  }
}
