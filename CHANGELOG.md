# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-08-17

### Fixed

- The bundle patch now composes the storage stack (`@deepseek-ai/dsh-storage` + `dsh-storage-json` + `dsh-storage-domain`) and declares all three packages, so a bare profile gets the `storageDomain` service the plugin injects instead of hanging with `pending (waiting for service: storageDomain)`.

## [0.1.0] - 2026-08-17

### Added

- Read-only performance diagnostics over the `session/event` stream: session load (open/restore) timing, spill-hit counts, compaction count and trigger, context-injection volume (AGENTS.md/skills/tool-schema/surface token shares), and LLM cache hit rate.
- `/fast` slash command and `fast_report` model tool returning the same structured health report plus threshold-driven optimization suggestions.
- Durable metric persistence to the `dsh_fast` storage domain (bounded per-session history) on an async sampling timer, off the model path.
- Fail-loud Schemastery config, pre-send sanitization, and real `Context`/`Session`/`ToolRuntime` vitest coverage against the 0.1.0-rc.6 peers.
