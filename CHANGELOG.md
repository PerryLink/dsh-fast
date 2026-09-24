# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.16] - 2026-09-24
### Changed

- Move the `@deepseek-ai/dsh-*` pins from `0.1.7-alpha.2` to `0.1.7-rc.1` and re-verify against that host line. `dshWorkshop.compatibility.dshVersions` records `0.1.7-rc.1` alongside the earlier lines, the five READMEs name `dsh-v0.1.7-rc.1`, and the compat workflow installs the `0.1.7-rc.1` host (`@deepseek-ai/dsh`, `dsh-base`, `dsh-headless`). The declared peer ranges and `engines.dsh` are deliberately **unchanged**: the existing four-clause union already admits `0.1.7-rc.1`, and the family convention keeps the declared range wider than the verified line. `0.1.7-rc.1` carries no plugin-facing seam change over `0.1.7-alpha.2` — the host's core packages differ only in their version fields — so no source or test expectation had to change. The two bare-name workspace `overrides` rows (`@deepseek-ai/dsh-typert-protocol`, `@deepseek-ai/dsh-session-query`) move to `0.1.7-rc.1`; their override **keys** keep the `^0.1.7-alpha.2` range deliberately, because that is the range pnpm matches against the transitive peer edges.

## [0.2.15] - 2026-09-23

### Fixed

- Session format V4 broke the tool-result read. `flattenToolResultText()` read the V3 wrapper shape (`message.content[0].content`), but V4 — the `0.1.7` line — lifted the tool result to a first-class tool-role message whose `content` **is** the block array, and `'tool-result'` left `ContentBlockMap` entirely, so the declaration build failed with `Property 'content' does not exist on type 'ContentBlock'`. It now reads both shapes structurally, the same style as the existing pre-`0.1.5` `legacySystemText` fallback, so a host on either line reports identical metrics — this repo's peer range still admits the older lines at runtime. A new regression case locks the released V3 wrapper shape.
- `createSystemMessage(text, plugin)` became `createSystemMessage(text)` on the `0.1.7` line (the producer label was dropped with the message-source rework), which failed typecheck with `Expected 1 arguments, but got 2` at seven call sites. The call sites now pass the rendered prompt alone; the removed label was never asserted anywhere.

### Changed

- Move the `@deepseek-ai/dsh-*` dev/test pins to `0.1.7-alpha.2`, and the `@deepseek-ai/cordis` / `@deepseek-ai/schemastery` dev carets to the versions that line declares, so the workspace resolves one Schemastery and one typert-protocol copy.
- Every declared host range — `engines.dsh` and the eight `peerDependencies` bands — gains the `|| >=0.1.7-0 <0.2.0` arm, so the bands now admit the `0.1.7` prerelease line. Under semver's prerelease rule a range whose only prerelease comparators sit on earlier version tuples cannot admit a later alpha, so the previous three-clause form excluded the very host this release targets. No existing arm was removed or narrowed.
- `dshWorkshop.compatibility.dshVersions` gains `0.1.7-alpha.2`, and all five READMEs name the verified line.
- The pnpm workspace overrides follow the line: the `@deepseek-ai/dsh-typert-protocol` pin that exists to keep ONE copy in the tree moves to `0.1.7-alpha.2`, and an explicit override pins `@deepseek-ai/dsh-session-query` (a peer-only seam this repo never imports directly) so the graph holds no older-line subgraph.
- A new `typecheck:checkout` ruler (`tsc -p tsconfig.checkout.json --noEmit`) compiles against the local harness checkout's built type faces alongside the published-face ruler.
- The compat workflow now installs the `0.1.7-alpha.2` host instead of `0.1.6-alpha.2`, so the scheduled end-to-end run exercises the line this package declares.

## [0.2.14] - 2026-09-19

### Added

- `pnpm run check:lockfile` (`scripts/check-lockfile-drift.mjs`) fails fast when `package.json` and `pnpm-lock.yaml` disagree; the probe is read-only and the documented checks chain runs it alongside the other gates.

### Changed

- The release workflow now publishes through **npm trusted publishing** (OIDC) instead of the long-lived `NPM_TOKEN` secret: `setup-node` no longer sets `registry-url` (its empty `_authToken` line made the registry answer 404 on PUT), npm is upgraded to >= 11.5.1 before publishing, and the "NPM_TOKEN is not set -> skip" guard is gone so a missing publisher cannot turn a release into a silent no-op.
## [0.2.13] - 2026-09-18

### Changed

- Read the session surface through the optional `sessionQuery` service instead of the deprecated synchronous `Session.eventAt(seq)` accessor (the peer set gains `@deepseek-ai/dsh-session-query`). A host that composes no `sessionQuery` keeps working through an equivalent synchronous read resolved from one accepted-log snapshot; a failing async read degrades to it with one warning. Internal implementation change: the reported metrics are byte-identical for the same log.
- All registrations and resources (the `/fast` command, the `fast_report` tool, the three session listeners, the sampling timer, and the storage domain) now live in one lifecycle effect whose disposer releases them in reverse order. Before this, an unmount that raced `apply` could lose the command and the tool for the rest of the process and leak the domain handle — a disable/enable round trip now restores both, exactly once.
- Declare `dsh.manifestVersion: 1` and the canonical three-clause `engines.dsh` range.

### Added

- An optional `ctx.inspector` metrics outlet (read structurally, never injected, never the only outlet: every metric stays available through `/fast` and `fast_report`). Metric publishing to it is best-effort and cannot break a report.

### Fixed

- Degradation paths are no longer silent: a missing token meter (heuristic token pricing) or a missing system-prompt service (single-bucket attribution) is announced once per process instead of quietly changing what the numbers mean. A failing inspector outlet is announced once too, with the report surfaces unaffected.

### Notes

- Upstream follow-up (recorded, not implemented): once `ctx.inspector` leaves experimental status, the self-built metric publishing here can be folded into it. The structural read above is deliberately tolerant so that change stays local.

## [0.2.12] - 2026-09-12

### Changed

- Rename the four translated READMEs to `README-<lang>.md`. npm selects the package-page readme as the first markdown file matching its `{README,README.*}` glob (`@npmcli/package-json`, publish path), and that glob order puts `README.<lang>.md` ahead of `README.md` — so npm was serving the Simplified-Chinese file for this package too (measured on 15/15 sampled packages of the family). The new names sit outside the glob, so the English source is served again. No content changed apart from the language-switcher link each translation holds to its siblings, and the repo readme gate still passes. Takes effect with the next release; an already-published version cannot gain a corrected readme retroactively.
- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.2` line and record `0.1.5-rc.2` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.2`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

### Fixed

- The release workflow claimed provenance but never passed the flag: it runs `npm publish --access public`, and npm only attests a token-based publish when `--provenance` is given explicitly. The publish step is now `npm publish --access public --provenance`, matching the rest of the family. Takes effect from the next release; an already-published version cannot gain attestations retroactively.

## [0.2.11] - 2026-09-10

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
