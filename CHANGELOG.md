# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-27

### Added
- JSONL project registry with add, remove, find, use, pin, unpin, and recent
- Active-project tracking with persistent metadata
- Project discovery scanner (opencode.jsonc / opencode.json / AGENTS.md / .opencode) with skip-list
- Per-project session stats from the OpenCode SQLite database, including subdirectory matches
- Detached project launcher (`tf open`) with dry-run mode
- CLI with add, remove, list, use, open, recent, pin, unpin, scan, stats, and health commands
- Dual-runtime SQLite adapter (node:sqlite / bun:sqlite) with zero dependencies
- 40 tests covering registry, stats, scan, and CLI