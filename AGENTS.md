# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-fast`). Development follows the dsh-plugin-guide skill and the official plugin contract; this file records repo-local decisions.

## Layout

- `src/index.ts` — function-plugin contract (`name`/`inject`/`Config`/`apply`; NO default export). Injects `commands`, `tools`, and `storageDomain`. Async `apply`: resolves config, opens the `dsh_fast` domain, assembles the collector and the report surfaces, registers one `ctx.effect` that owns the sampling timer plus the domain teardown, and listens on `session/created`, `session/event`, and `session/disposed`.
- `src/config.ts` — Schemastery schema + explicit `resolveConfig` (no hidden `?? default` in run paths). Numeric bounds fail loud at mount.
- `src/collector.ts` — the event→snapshot fold over a real `Session`; all inline work is O(1) per event. The optional token meter is consulted only in `snapshot()`.
- `src/analyze.ts` — pure report assembly: threshold-driven suggestions, `/fast` text rendering, and final report sanitization.
- `src/store.ts` — the `dsh_fast` storage-domain declaration (zod value schema) and the bounded-history append.
- `src/estimate.ts` — the fixed-density heuristic that mirrors `@deepseek-ai/dsh-token-meter`'s estimator (not exported as a public subpath).
- `src/sanitize.ts` — pure display/durable-boundary sanitization.
- `scripts/` — `prepare.mjs` (build), `verify-self-contained.mjs`, `verify-artifacts.mjs`, `check-readme-sync.mjs` (five-language gate), `release.mjs` (bump + stamp + gate + commit + tag, never pushes), `changelog-section.mjs`.
- `test/` — vitest; REAL `Context`/`SessionStore`/`Session`/`ToolRuntime`/`CommandRuntime`/`TokenMeter` and the REAL storage seam (dsh-storage + dsh-storage-json + dsh-storage-domain) from the 0.1.0-rc.6 peers. Only the optional token-meter measure function is scripted.

## Hard rules applied here

- **Read-only, off the model path.** The plugin folds session events O(1) per event and snapshots on a timer; it never touches `tools/*` waterfalls or the model request.
- **Storage domain, not session events.** The rc.6 `Session.append` signature has no `ignorable` marker (`...opts: []` for non-surface events) and there is no external event-registration surface, so a custom `fast/*` session event would make the persistence coordinator (`assertEventsSupported`) refuse the log on restore. Metrics therefore persist to the `dsh_fast` storage domain; the raw events remain the reconstructable source of truth.
- **Sanitize before display/durable write.** `sessionId` and the optional `cwd` are sanitized; control characters never reach a report or the domain.
- **No tunables hardcoded.** Every knob is a validated `Config` field with a default in `src/config.ts`, an inline comment in `cordis.patch.yml`, and a row in the five-language README configuration table.
- **This plugin registers no waterfall listeners.** If one is ever added, allow/passthrough MUST call `next()`.

## Checks

`pnpm run typecheck && pnpm run typecheck:ci && pnpm test && pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && node scripts/check-readme-sync.mjs && pnpm pack`

- `typecheck` resolves `@deepseek-ai/*` through the installed 0.1.0-rc.6 peers; `typecheck:ci` clears `skipLibCheck` and enables `verbatimModuleSyntax` against the published types. Both must stay green.

## Release

`node scripts/release.mjs <x.y.z>` bumps package.json + `src/version.ts`, stamps the CHANGELOG `[Unreleased]` section, re-runs the full gate, and commits + tags (never pushes). `git push origin main --follow-tags` triggers `.github/workflows/release.yml`, which re-runs the gate, publishes to npm with provenance, and creates the GitHub Release from the stamped CHANGELOG section.

## Docs

- Five-language READMEs (`README.md`, `README.zh.md`, `README.es.md`, `README.pt.md`, `README.hi.md`) — keep all five in sync; the English file is the source of truth. `scripts/check-readme-sync.mjs` (CI) enforces section structure and configuration-table keys.
- GitHub topics `dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `performance`, `diagnostics`, `profiling`, `context-engineering`, `llm-cache` (mirror `package.json` keywords).
- License is Apache-2.0 (`LICENSE` + the package.json `license` field). `THIRD_PARTY_NOTICES.md` documents the build-time dependencies.
