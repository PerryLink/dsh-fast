# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-08-21

### Changed

- DeepSeek Harness rc8 compatibility release: every `@deepseek-ai/dsh-*` peer moves from `0.1.0-rc.6` to `0.1.0-rc.8` (devDependencies pinned to the exact `0.1.0-rc.8`, peerDependencies widened to `>=0.1.0-rc.8 <0.2.0`), and the five-language READMEs, AGENTS.md, THIRD_PARTY_NOTICES.md, the pnpm release-age exclusions, and the CI workflows now target the `0.1.0-rc.8` family.

### Fixed

- `test/index.spec.ts` and `scripts/loader-runner.mjs` pass the rc8 `CommandRuntime.execute(agent, line, images, signal)` signature (explicit empty image list); the collector, storage-domain, tools, commands, and compaction seams are verified against the rc8 peers unchanged.

## [0.1.1] - 2026-08-17

### Fixed

- The bundle patch now composes the storage stack (`@deepseek-ai/dsh-storage` + `dsh-storage-json` + `dsh-storage-domain`) and declares all three packages, so a bare profile gets the `storageDomain` service the plugin injects instead of hanging with `pending (waiting for service: storageDomain)`.

## [0.1.0] - 2026-08-17

### Added

- Read-only performance diagnostics over the `session/event` stream: session load (open/restore) timing, spill-hit counts, compaction count and trigger, context-injection volume (AGENTS.md/skills/tool-schema/surface token shares), and LLM cache hit rate.
- `/fast` slash command and `fast_report` model tool returning the same structured health report plus threshold-driven optimization suggestions.
- Durable metric persistence to the `dsh_fast` storage domain (bounded per-session history) on an async sampling timer, off the model path.
- Fail-loud Schemastery config, pre-send sanitization, and real `Context`/`Session`/`ToolRuntime` vitest coverage against the 0.1.0-rc.6 peers.
