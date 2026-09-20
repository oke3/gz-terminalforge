# gz-terminalforge

> Terminal workspace for OpenCode projects — registry, launcher, and session stats. Alias: `tf`.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Ground Zero LLC](https://img.shields.io/badge/Built%20by-Ground%20Zero%20LLC-purple)](https://github.com/oke3)
[![npm](https://img.shields.io/npm/v/@ground-zero-llc/gz-terminalforge)](https://www.npmjs.com/package/@ground-zero-llc/gz-terminalforge)
[![CI](https://github.com/oke3/gz-terminalforge/actions/workflows/ci.yml/badge.svg)](https://github.com/oke3/gz-terminalforge/actions)

## Why

If you live in the terminal, jumping between OpenCode projects means remembering paths, re-typing launch commands, and losing track of where you spent your sessions and budget. You've got five projects open, three more in `~/Projects`, and no quick way to see which one is burning the most tokens.

**terminalforge** gives you a project workspace in your shell:

- **Registry** — add, scan, and organize your OpenCode projects in one place
- **Launcher** — `tf open` drops you into any project with one command
- **Stats** — per-project session counts, cost, and tokens straight from the OpenCode database
- **Discovery** — `tf scan` auto-detects OpenCode projects under any directory tree

One command to navigate all your projects.

## Install

```bash
npm install -g @ground-zero-llc/gz-terminalforge
```

Requires Node 22.5+ (uses `node:sqlite`; falls back to `bun:sqlite` under Bun).

The `tf` alias is installed automatically alongside `terminalforge`.

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

# Pin important projects to the top
tf pin my-app
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     CLI / Shell                        │
│   tf add | list | use | open | scan | stats | ...     │
└───────────────┬──────────────────────────────────────┘
                │
     ┌──────────┼──────────────┐
     ▼          ▼              ▼
┌──────────┐ ┌─────────┐ ┌──────────┐
│ Project  │ │  scan() │ │  stats() │
│ Registry │ │ (scan.ts│ │ (stats.ts│
│ (projects│ │ project │ │ project  │
│  .ts)    │ │ discov- │ │ cost +   │
│          │ │ ery)    │ │ tokens   │
│ ~/.term- │ └─────────┘ └────┬─────┘
│ inalforge│                  │
│ ├─reg.json│    ┌────────────▼────────────┐
│ └─meta.json│   │   OpenCode Database      │
└──────────┘    │   (SQLite — read-only)    │
                │   ~/.local/share/opencode/ │
                │        opencode.db          │
                └─────────────────────────────┘
```

**Pipeline:**
1. `ProjectRegistry` manages a JSON file of registered projects (name, directory, pinned, lastUsed)
2. `scanProjects()` walks a directory tree, detecting OpenCode projects by config files (`opencode.jsonc`, `AGENTS.md`, `.opencode/`)
3. `getProjectStats()` queries the SQLite database for session counts, cost, and tokens per project directory
4. `tf open` spawns `opencode` in the project directory (detached, background)

## Feature Highlights

### Project Discovery

`tf scan` walks a directory tree looking for OpenCode projects — directories containing `opencode.jsonc`, `opencode.json`, `AGENTS.md`, or `.opencode/`. It automatically skips `node_modules`, `.git`, `dist`, `.next`, and other build/cache directories.

```bash
tf scan ~/Projects --depth 2
# → Scanned /home/you/Projects: found 10 project(s), added 10 new
# →   /home/you/Projects/my-app
# →   /home/you/Projects/api-server
# →   /home/you/Projects/docs-site
```

### Live Session Stats

`tf list` and `tf stats` pull directly from the OpenCode database. A project's stats include sessions run from the project directory **or anything under it**, so sessions launched from subdirectories still count.

```bash
tf list
# → TerminalForge — 10 project(s)
# → Total: 317 sessions, $15.09, 109.9M tokens
# →   my-app — /home/you/Projects/my-app
# →     42 sessions, $1.2345, 1.2M tokens, last 2026-08-20
# → * api-server — /home/you/Projects/api-server  [pin]
# →     89 sessions, $8.9123, 45.6M tokens, last 2026-09-19
```

### One-Command Launch

`tf open` spawns a detached `opencode` process in the active (or named) project directory. No need to `cd` first.

```bash
tf use my-app
tf open
# → Launched opencode in my-app (/home/you/Projects/my-app)
```

Use `--dry-run` to preview without launching:

```bash
tf open my-app --dry-run
# → Would run: opencode (cwd: /home/you/Projects/my-app)
```

### Pin Important Projects

Pin projects to keep them at the top of your list:

```bash
tf pin my-app
tf unpin my-app
```

### Recent Projects

See which projects you've used recently:

```bash
tf recent
# → Recent projects:
# →   my-app — /home/you/Projects/my-app (2026-09-19)
# →   api-server — /home/you/Projects/api-server (2026-09-18)
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

### What's Measured

| Metric | Description |
|--------|-------------|
| **Sessions** | Number of OpenCode sessions in this project directory (and subdirectories) |
| **Total cost** | Sum of the `cost` field across matching sessions (USD) |
| **Total tokens** | Sum of `tokens_input + tokens_output` across matching sessions |
| **Last activity** | Timestamp of the most recent session in this directory |

## Project Discovery

`tf scan` walks a directory tree (default depth 3) looking for OpenCode projects. A directory is recognized as a project if it contains any of:

- `opencode.jsonc` — OpenCode configuration
- `opencode.json` — OpenCode configuration (JSON)
- `AGENTS.md` — Agent instructions file
- `.opencode/` — OpenCode data directory

**Skipped directories:** `node_modules`, `.git`, `dist`, `.next`, `build`, `out`, `.cache`, `.venv`, `venv`, `__pycache__`, `target`, `vendor`, `coverage`

Results are sorted alphabetically by directory name.

## Library API

```typescript
import { ProjectRegistry, getProjectStats, scanProjects } from '@ground-zero-llc/gz-terminalforge'

// Create a registry
const registry = new ProjectRegistry('./data')
registry.add('./my-project')
registry.use('./my-project')

// Scan for projects
const found = scanProjects('~/Projects', 2)
// → ['/home/you/Projects/my-app', '/home/you/Projects/api-server', ...]

// Get session stats for a project
const stats = getProjectStats(
  '~/.local/share/opencode/opencode.db',
  '/abs/path/my-project',
)
// → { directory: '/abs/path/my-project', sessions: 42, totalCost: 1.23, ... }
```

### Types

```typescript
interface ProjectEntry {
  name: string
  directory: string
  pinned: boolean
  lastUsedAt: number
  addedAt: number
}

interface ProjectStats {
  directory: string
  sessions: number
  totalCost: number
  totalTokens: number
  lastActivity: number
}
```

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `TERMINALFORGE_DATA_DIR` | `~/.terminalforge` | Registry storage directory |
| `OPENCODE_DB_PATH` | `~/.local/share/opencode/opencode.db` | OpenCode's SQLite database |
| `OPENCODE_BIN` | `opencode` | Binary launched by `tf open` |

## Privacy

**terminalforge is local-first and privacy-by-design:**

- **Read-only** — The OpenCode database is never written to.
- **Local registry** — Project data lives in `~/.terminalforge/` on your machine.
- **Zero telemetry** — No analytics, no phone-home, no tracking.
- **No cloud dependency** — Everything runs offline.

## Related Projects

| Project | What It Does |
|---------|-------------|
| [gz-sessions](https://github.com/oke3/gz-sessions) | Persistent cross-session memory for AI agents |
| [gz-sessionrecall](https://github.com/oke3/gz-sessionrecall) | AI code archaeology — search your session history |
| [gz-codemap](https://github.com/oke3/gz-codemap) | Scan codebases → auto-generate project config |
| [gz-modelrouter](https://github.com/oke3/gz-modelrouter) | Intelligent LLM cost router — save 40-70% on bills |
| [gz-gateway](https://github.com/oke3/gz-gateway) | OpenAI-compatible AI gateway — rate limiting, caching, failover, cost tracking |
| [gz-agent](https://github.com/oke3/gz-agent) | Production-grade agent runtime — tool calling, state machines, multi-agent coordination |
| [gz-eval](https://github.com/oke3/gz-eval) | Evaluation framework — golden test sets, quality scoring, A/B comparison |
| [gz-guardrails](https://github.com/oke3/gz-guardrails) | AI safety middleware — PII detection, prompt injection defense, content moderation |
| [gz-bench](https://github.com/oke3/gz-bench) | Standardized benchmark harness for AI coding agents |
| [gz-authmesh](https://github.com/oke3/gz-authmesh) | Unified credential mesh for AI providers |
| [gz-remote](https://github.com/oke3/gz-remote) | Drive AI coding agents on remote machines over SSH |
| [gz-context-engine](https://github.com/oke3/gz-context-engine) | Production-grade RAG context engine |

---

## Enterprise Support

Need this customized for your infrastructure? We offer:

- **Integration consulting** — Wire gz-terminalforge into your development workflow
- **Custom configuration** — Task-specific rules, models, and workflows for your team
- **Managed deployment** — We host and maintain your instance
- **Training workshops** — Hands-on sessions for your engineering team

[Book a 30-min call](https://www.grndxero.com/brief) · [See pricing](https://www.grndxero.com/pricing)

---

## License

MIT — Ground Zero LLC

---

Built by [Ground Zero LLC](https://github.com/oke3) — AI infrastructure for the agentic age.
