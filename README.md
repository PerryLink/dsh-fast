# dsh-fast

Read-only performance diagnostics for DeepSeek Harness. `dsh-fast` observes the session event stream — never the model hot path — and reports where your session's latency and context budget actually go: session load (open/restore) timing, spill-hit counts, compaction count and trigger, context-injection volume (AGENTS.md / skill directory / tool schema / surface token share), and the LLM cache hit rate. It surfaces those as the `/fast` slash command and the `fast_report` model tool, and persists them to the harness storage domain on an async sampling timer.

## Compatibility

- DeepSeek Harness `0.1.0-rc.6` (peers pinned to `0.1.0-rc.6`).
- Node `^22.19.0 || >=24.0.0`, ESM only (`"type": "module"`).
- Peer dependencies: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, and `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-storage-domain` at `0.1.0-rc.6`.

## What you get

- **Session load timing** — publication-to-first-request latency, classified `open` (fresh) vs `restore` (seeded/resumed), plus the restored seed-event count.
- **Spill-hit statistics** — how many tool results were spilled to a session-scoped artifact (detected from the durable spill notice).
- **Compaction count and trigger** — total compactions, split `manual` (slash command) vs `automatic` (pressure), and total shadowed tokens.
- **Context-injection volume** — system-prompt (AGENTS.md + skills + persona), tool-schema, and surface tokens with their shares of the total.
- **LLM cache hit rate** — input / cache-read / cache-write / output tokens aggregated from provider usage, plus the derived hit rate.
- **Optimization suggestions** — threshold-driven notes (trim skills, tighten tool schemas, compact earlier, enable prompt caching, enable spill-policy, …).
- **Async sampling** — metrics are folded O(1) per event and snapshotted on a timer, never on the append path.

## Quick start

### git channel

```sh
# From a scratch profile (pins the commit; runs the self-contained `prepare` build)
dsh plugin --profile demo add "github:YOUR_ORG/dsh-fast#<sha>"
# The profile's pnpm-workspace.yaml gains an allowBuilds entry for dsh-fast on first add.
```

### npm channel

```sh
dsh plugin --profile demo add dsh-fast
```

Both channels install the bundle row (see `cordis.patch.yml`) into the profile's `dsh.profile.bundles` stack and take effect on restart.

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-fast       # install
dsh plugin --profile demo remove dsh-fast    # uninstall
```

Verify the row mounts: `dsh --profile demo --dump-config | grep dsh-fast`.

## Configuration

All tunables are Schemastery `Config` fields; invalid values fail the profile load loudly.

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Master switch; `false` mounts nothing. |
| `privacy.includeCwd` | `false` | Include the sanitized session working directory in reports. |
| `sampling.snapshotIntervalMs` | `60000` | How often active sessions are sampled (ms). |
| `sampling.maxHistorySamples` | `20` | Samples retained per session in the durable history. |
| `thresholds.systemPromptTokens` | `20000` | Warn when the system prompt exceeds this many tokens. |
| `thresholds.toolSchemaTokens` | `8000` | Warn when the tool schema exceeds this many tokens. |
| `thresholds.surfaceTokens` | `60000` | Warn when the conversation surface exceeds this many tokens. |
| `thresholds.cacheHitRateFloor` | `0.1` | Warn when the cache hit rate falls below this (0..1). |
| `thresholds.compactionCountWarn` | `10` | Warn once this many compactions have triggered. |
| `thresholds.compactionShadowTokens` | `40000` | Warn when the average shadowed token count per summary exceeds this. |
| `spill.detectSpilledResults` | `true` | Detect spilled tool results from the durable notice marker. |

## Tools & surfaces

- **`/fast`** — a human slash command that prints the current session's health report: load timing, spill, compaction, context-volume ranking, cache hit rate, and suggestions.
- **`fast_report`** — a model tool returning the same report as structured JSON (so the model can reason over it), with a human-readable text render.

## Permissions & data

`dsh-fast` consumes only public seams: `session/*` and `agent/*` events, the optional `ctx.tokenMeter`, `ctx.storageDomain`, `ctx.commands`, and `ctx.tools`. It is strictly read-only over the session log — it never mutates the model request, tool results, or the session surface. Metrics are persisted to the `dsh_fast` storage domain (one bounded history per session), not to the session log. Report identity and the optional working directory are sanitized before any display or durable write.

## Security boundaries

- **Read-only, zero model-path overhead** — folding is O(1) per event; sampling runs on a timer.
- **No network, no credential handling** — the plugin makes no outbound requests and stores nothing sensitive.
- **Fail-loud configuration** — every tunable is validated at mount; invalid bounds throw.
- **Sanitized display/durable data** — control characters are stripped and strings are budgeted; `cwd` is off by default and path-truncated when enabled.
- **Reversible registrations** — every contribution goes through `ctx.effect()` / `ctx.on()` / `register()`, so uninstall and hot reload are clean.

## Known limitations

- **Storage domain, not session events** — rc.6 `Session.append` offers no `ignorable` marker and no external event-registration surface, so a custom `fast/*` session event would make the persistence coordinator refuse the log on restore. Metrics are therefore persisted to the storage domain; the raw events remain the reconstructable source of truth.
- **Spill detection is heuristic** — it reads the durable spill notice (`Full … stored at:`); no dedicated session event exists.
- **System prompt is one bucket** — AGENTS.md, skill directory, and persona are all part of the assembled system prompt; the header carries no per-section token accounting, so they are reported together.
- **Load timing starts at publication** — the disk-read portion of a restore happens before `session/created` (owned by `sessionPersistence`) and is not observable from this plugin's allowed events; the reported duration is publication-to-first-request.

## Development

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci
pnpm test
pnpm run build
pnpm run verify:self-contained && pnpm run verify:artifacts
node scripts/check-readme-sync.mjs
pnpm pack
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `performance`, `diagnostics`, `profiling`, `context-engineering`, `llm-cache`

## Contributors

`dsh-fast` contributors.

## License

Apache-2.0 — see [LICENSE](LICENSE).
