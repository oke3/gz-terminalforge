# gz-terminalforge

> Built by [Ground Zero LLC](https://github.com/oke3) — AI infrastructure for the agentic age.

Terminal workspace for OpenCode projects — registry, launcher, and session stats. Alias: `tf`.

[![CI](https://github.com/oke3/gz-terminalforge/actions/workflows/ci.yml/badge.svg)](https://github.com/oke3/gz-terminalforge/actions)
[![npm](https://img.shields.io/npm/v/@ground-zero-llc/gz-terminalforge)](https://www.npmjs.com/package/@ground-zero-llc/gz-terminalforge)
[![license](https://img.shields.io/npm/l/@ground-zero-llc/gz-terminalforge)](https://github.com/oke3/gz-terminalforge/blob/main/LICENSE)

## Why

If you live in the terminal, jumping between OpenCode projects means remembering paths, re-typing launch commands, and losing track of where you spent your sessions and budget. **terminalforge** gives you a project workspace in your shell:

- **Registry** — add, scan, and organize your OpenCode projects
- **Launcher** — `tf open` drops you into any project with one command
- **Stats** — per-project session counts, cost, and tokens straight from the OpenCode database

## Install

```bash
npm install -g @ground-zero-llc/gz-terminalforge
```

Requires Node 22.5+ (uses `node:sqlite`; falls back to `bun:sqlite` under Bun).

## Quick Start

```bash
# Discover projects under a directory and add them all
tf scan ~/Projects --depth 2
# → Scanned /home/you/Projects: found 10 project(s), added 10 new

# List projects with live session stats
tf list
# → TerminalForge — 10 project(s)
# → Total: 317 sessions, $15.09, 109.9M tokens
# →   my-app — /home/you/Projects/my-app
# →     42 sessions, $1.2345, 1.2M tokens, last 2026-08-20

# Set the active project and launch opencode in it
tf use my-app
tf open
# → Launched opencode in my-app (/home/you/Projects/my-app)

# Check a project's session stats
tf stats my-app
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `add <dir>` | Add a project to the registry |
| `remove <dir\|name>` | Remove a project |
| `list` | List registry projects with session stats |
| `use <dir\|name>` | Set the active project |
| `open [dir\|name] [--dry-run]` | Launch opencode in a project (detached) |
| `recent` | Show recently used projects |
| `pin <dir\|name>` / `unpin <dir\|name>` | Pin/unpin a project |
| `scan <dir> [--depth N]` | Discover and add projects under a directory |
| `stats [dir\|name]` | Session stats from the OpenCode DB |
| `health` | Registry and database status |

## Session Stats

Stats are read directly from OpenCode's SQLite database (read-only). A project's stats include sessions run from the project directory **or anything under it**, so sessions launched from subdirectories still count.

```bash
tf stats my-app
# → Stats for my-app (/home/you/Projects/my-app)
# →   Sessions:     42
# →   Total cost:   $1.2345
# →   Total tokens: 1.2M
# →   Last activity: 2026-08-20
```

## Project Discovery

`tf scan` walks a directory tree (default depth 3) looking for OpenCode projects — directories containing `opencode.jsonc`, `opencode.json`, `AGENTS.md`, or `.opencode/`. It skips `node_modules`, `.git`, `dist`, `.next`, and other build/cache directories.

## Library API

```typescript
import { ProjectRegistry, getProjectStats, scanProjects } from '@ground-zero-llc/gz-terminalforge'

const registry = new ProjectRegistry('./data')
registry.add('./my-project')
registry.use('./my-project')

const stats = getProjectStats('~/.local/share/opencode/opencode.db', '/abs/path/my-project')
const found = scanProjects('~/Projects', 2)
```

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `TERMINALFORGE_DATA_DIR` | `~/.terminalforge` | Registry storage |
| `OPENCODE_DB_PATH` | `~/.local/share/opencode/opencode.db` | OpenCode's SQLite database |
| `OPENCODE_BIN` | `opencode` | Binary launched by `tf open` |

## Related Projects

- [gz-sessions](https://github.com/oke3/gz-sessions) — Persistent cross-session memory for OpenCode agents
- [gz-codemap](https://github.com/oke3/gz-codemap) — Codebase mapping for OpenCode
- [gz-bench](https://github.com/oke3/gz-bench) — Benchmarking suite for OpenCode
- [gz-remote](https://github.com/oke3/gz-remote) — Drive OpenCode over SSH
- [gz-modelrouter](https://github.com/oke3/gz-modelrouter) — Intelligent LLM cost router for OpenCode
- [gz-sessionrecall](https://github.com/oke3/gz-sessionrecall) — AI code archaeology for OpenCode sessions
- [gz-learn](https://github.com/oke3/gz-learn) — Skill-building curriculum for OpenCode agents

## License

MIT © oke3