# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Read-only performance diagnostics over the `session/event` stream: session load (open/restore) timing, spill-hit counts, compaction count and trigger, context-injection volume (AGENTS.md/skills/tool-schema/surface token shares), and LLM cache hit rate.
- `/fast` slash command and `fast_report` model tool returning the same structured health report plus threshold-driven optimization suggestions.
- Durable metric persistence to the `dsh_fast` storage domain (bounded per-session history) on an async sampling timer, off the model path.
- Fail-loud Schemastery config, pre-send sanitization, and real `Context`/`Session`/`ToolRuntime` vitest coverage against the 0.1.0-rc.6 peers.
