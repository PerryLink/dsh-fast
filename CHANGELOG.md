# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.1` line and record `0.1.5-rc.1` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.1`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

### Docs

- Refresh the five-language README compatibility baseline to `dsh-v0.1.5-rc.1` (verified 2026-09-10).

## [0.2.10] - 2026-09-09

### Fixed

- Read the system prompt from the session surface on `0.1.5-alpha.1`: it is now surface node 0 (a `system/message`) instead of `EpochHeader.system`, which the envelope type no longer declares. The collector takes the last non-empty system node (an empty node is dormant and never restores older text), mirroring the host agent loop, and prices it with the same per-block heuristic as `dsh-token-meter`'s `estimateSystemMessage`.
- Price the meter's conversation surface net of the system prompt on `0.1.5-alpha.1`: `tokenMeter.measure().surfaceTokens` now includes the system node, so subtracting `systemTokens` keeps the prompt out of the surface bucket (it was counted in both) and stops it from inflating the `thresholds.surfaceTokens` signal.
- Mount `SessionProjection` in the test harness: `TokenMeter` injects `sessionProjections` on `0.1.5-alpha.1`, so the meter silently stayed unmounted and the meter branch had zero coverage. The harness now fails loudly when the meter does not mount.

### Changed

- Adapt to DeepSeek Harness `0.1.5-alpha.1` (public tag commit `5dda764ed3`): devDependencies pin `0.1.5-alpha.1`, peers widen to `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` (the prerelease tuple in the old single range never matched `0.1.5-alpha.1`), `dshWorkshop.compatibility.dshVersions` lists both lines, and the compat workflow pins `@deepseek-ai/dsh` / `dsh-base` / `dsh-headless` at `0.1.5-alpha.1`.
- The `0.1.2-rc.1` line stays supported at runtime: when no `system/message` node exists, the collector still prices the legacy `header.system` string through a structural read, and it does not subtract it from the meter surface (legacy meters never contained the prompt).
- `context.surfaceTokens` is now conversation history only, so the system/tools/surface buckets no longer double-count the prompt. Samples persisted in the `dsh_fast` domain before this release were written under the old surface semantics: trends that cross this version step change definition.

### Docs

- Five-language READMEs: host baseline `dsh-v0.1.5-alpha.1` (verified 2026-09-09), the composite peer range and the `0.1.5-alpha.1` devDependency pins, the "system prompt is one bucket" limitation (it is surface node 0 now), and the surface-token definition.
- AGENTS.md, THIRD_PARTY_NOTICES.md, the issue template, and the compat/CI workflow labels refreshed to the `0.1.5-alpha.1` baseline.

## [0.2.9] - 2026-09-08

### Docs

- Repair GBK mojibake in the package.json description: the em dash was corrupted to the U+95B3 U+003F marker pair; the description is restored to the clean pre-corruption text; no behavior change.

## [0.2.8] - 2026-09-07

### Docs

- Fix the DSH plugin badge URL: shields.io rejects the four-segment static badge form with "404 badge not found"; the label now uses the documented double-dash form (`dsh--plugin`), rendering identically; no behavior change.

## [0.2.7] - 2026-09-07

### Fixed

- Align the `@deepseek-ai/dsh-*` peer ranges to `>=0.1.2-rc.1 <0.2.0`: the older `>=0.1.0-rc.8 <0.2.0` band resolved to only the `0.1.0-rc.8` prerelease under registry-driven resolution and broke fresh tarball installs; no behavior change.

### Docs

- Refresh the five-language README support-version wording: the verified GitHub tag `dsh-v0.1.3-alpha.1` now leads the compatibility claim, while npm `0.1.2-rc.1` stays the published dependency-pin line (peers `>=0.1.2-rc.1 <0.2.0`); no behavior change.


## [0.2.6] - 2026-09-04

### Fixed

- Remove the `storage` / `storage-json` / `storage-domain` rows from the bundle patch: the shipped profiles compose that stack through `dsh-base`, so the inserted rows collided with the same ids and made the profile refuse to boot (`duplicate loader entry id: storage`). The patch now mounts only the plugin row; bare profiles compose the storage stack themselves.

## [0.2.5] - 2026-09-04

### Changed

- Align the devDependency pins to the published dsh `0.1.2-rc.1` line, move the compat CI harness probes from `0.1.1-rc.2` to `0.1.2-rc.1`, refresh the stale peer references in the five-language READMEs and AGENTS.md, and re-verify the adaptation claims; no behavior change.

## [0.2.4] - 2026-09-02

### Docs

- Sync the five-language READMEs to the 0.1.2-alpha.5 facts; no behavior change.

## [0.2.3] - 2026-09-02

### Changed

- Align the devDependency pins to the published dsh 0.1.2-alpha.5 line and re-verify the adaptation claims; no behavior change.

## [0.2.2] - 2026-09-01

### Changed

- Align the devDependency pins to the published dsh `0.1.2-alpha.3` line (9 `@deepseek-ai/dsh-*` packages) and align `cordis`/`schemastery` to `^4.0.2`/`^3.18.2`. Metrics still persist to the `dsh_fast` storage domain (`Session.append` still cannot stamp the `ignorable` marker on `0.1.2-alpha.3`); the five-language READMEs record the alpha.3 fact.

## [0.2.1] - 2026-08-30

### Fixed

- Tests no longer import the `CallId` brand from `@deepseek-ai/dsh-llm` (renamed to `ToolCallId` on host master): the call-id brand is now derived from the `dsh-tools` execution contract, staying green on both the published rc line and the 0.1.2-alpha.1 checkout. Behavior unchanged.

## [0.2.0] - 2026-08-26

### Added

- System prompt bucket breakdown (AGENTS.md / skills / persona).

## [0.1.3] - 2026-08-22

### Changed

- DeepSeek Harness rc2 compatibility release: every `@deepseek-ai/dsh-*` peer moves from `0.1.0-rc.8` to `0.1.1-rc.2` (devDependencies pinned to the exact `0.1.1-rc.2`, peerDependencies kept at `>=0.1.0-rc.8 <0.2.0`), and the five-language READMEs, AGENTS.md, THIRD_PARTY_NOTICES.md, the pnpm release-age exclusions, and the CI workflows now target the `0.1.1-rc.2` family. The commands/tools/storage seams are verified against the rc2 peers unchanged.

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
