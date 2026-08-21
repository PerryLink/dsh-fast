<div align="center">

# ⚡ dsh-fast

**Read-only performance diagnostics for DeepSeek Harness.**

*Observes the session event stream — never the model hot path — and reports where latency and context budget actually go.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-fast/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-fast/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-fast?label=version)](https://github.com/PerryLink/dsh-fast/releases)
[![npm version](https://img.shields.io/npm/v/dsh-fast)](https://www.npmjs.com/package/dsh-fast)
[![npm downloads](https://img.shields.io/npm/dm/dsh-fast)](https://www.npmjs.com/package/dsh-fast)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

- DeepSeek Harness `0.1.0-rc.8` (peers pinned to `0.1.0-rc.8`).
- Node `^22.19.0 || >=24.0.0`, ESM only (`"type": "module"`).
- Peer dependencies: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, and `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-storage-domain` at `0.1.0-rc.8`.

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

- **Storage domain, not session events** — rc.8 `Session.append` offers no `ignorable` marker and no external event-registration surface, so a custom `fast/*` session event would make the persistence coordinator refuse the log on restore. Metrics are therefore persisted to the storage domain; the raw events remain the reconstructable source of truth.
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

## PerryLink DSH Plugin Family

This project is one of the [29 DeepSeek Harness plugins](https://github.com/PerryLink) maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Second-model auto-review on the approval chain, fail-closed by default |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Durable background child agents with a Web UI sidebar, messaging and interrupt |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH |
| [dsh-click](https://github.com/PerryLink/dsh-click) | Cross-platform native desktop control for DeepSeek Harness — Windows first. |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Terminal-style input history for the web composer: arrows, Ctrl+R search |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Engineering-discipline guard: requirements grill, test gates, adversary review |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | Unified static-image generation routing for DeepSeek Harness. |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. |
| [dsh-github](https://github.com/PerryLink/dsh-github) | GitHub PR/issues integration for DSH, every write gated by approval |
| [dsh-library](https://github.com/PerryLink/dsh-library) | Local document knowledge base for DeepSeek Harness. |
| [dsh-local-ai](https://github.com/PerryLink/dsh-local-ai) | Local-model (Ollama) integration for DeepSeek Harness. |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | LSP diagnostics, formatting, completion, code actions and rename over language servers |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | PII masking middleware for DeepSeek Harness — anonymize personal data before it reaches the model, restore it at the display layer. |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles-equivalent runtime style switching |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code-style declarative allow/deny/ask permission rules with audit |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Plugin-development knowledge base as an on-demand agent skill |
| [dsh-score](https://github.com/PerryLink/dsh-score) | Multi-dimensional quality scoring for DeepSeek Harness plugins. |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Pin sessions in the Web sidebar with durable ordering |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Security-audit skill pack: secret scan, dependency and supply-chain review |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |

## License

Apache-2.0 — see [LICENSE](LICENSE).
