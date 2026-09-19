// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { execSync } from 'node:child_process'
import { openDb } from '../src/sqlite.js'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const CLI = join(import.meta.dir, '..', 'src', 'cli.ts')

let dir: string
let dataDir: string
let dbPath: string
let projDir: string

function run(args: string): string {
  return execSync(`bun run ${CLI} ${args}`, {
    env: { ...process.env, TERMINALFORGE_DATA_DIR: dataDir, OPENCODE_DB_PATH: dbPath, OPENCODE_BIN: 'true' },
    encoding: 'utf-8',
    timeout: 10_000,
  }).trim()
}

function createFixtureDb(path: string): void {
  const sqlite = openDb(path)
  sqlite.exec(`
    CREATE TABLE session (
      id text PRIMARY KEY, project_id text NOT NULL, slug text NOT NULL,
      directory text NOT NULL, title text NOT NULL, version text NOT NULL,
      cost real DEFAULT 0 NOT NULL, tokens_input integer DEFAULT 0 NOT NULL,
      tokens_output integer DEFAULT 0 NOT NULL, agent text, model text,
      time_created integer NOT NULL, time_updated integer NOT NULL
    );
  `)
  sqlite.prepare(`
    INSERT INTO session (id, project_id, slug, directory, title, version, cost, tokens_input, tokens_output, agent, model, time_created, time_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('s1', 'p1', 's1', projDir, 'One', '1.0', 0.01, 100, 50, 'build', 'm1', 1_700_000_000_000, 1_700_000_000_100)
  sqlite.close()
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'terminalforge-cli-'))
  dataDir = join(dir, 'data')
  dbPath = join(dir, 'opencode.db')
  projDir = join(dir, 'my-project')
  mkdirSync(projDir)
  writeFileSync(join(projDir, 'opencode.jsonc'), '{}')
  createFixtureDb(dbPath)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('CLI', () => {
  it('shows usage with no args', () => {
    const output = run('')
    expect(output).toContain('terminalforge')
    expect(output).toContain('Usage')
  })

  it('add registers a project', () => {
    const output = run(`add ${projDir}`)
    expect(output).toContain('Added: my-project')
  })

  it('add errors on missing directory', () => {
    expect(() => run(`add ${join(dir, 'nope')}`)).toThrow('Directory not found')
  })

  it('list shows projects with stats', () => {
    run(`add ${projDir}`)
    const output = run('list')
    expect(output).toContain('my-project')
    expect(output).toContain('1 sessions')
  })

  it('use sets the active project', () => {
    run(`add ${projDir}`)
    const output = run(`use my-project`)
    expect(output).toContain('Active: my-project')
  })

  it('open --dry-run prints the command', () => {
    run(`add ${projDir}`)
    const output = run(`open my-project --dry-run`)
    expect(output).toContain('Would run: true')
    expect(output).toContain(projDir)
  })

  it('open with no active project errors', () => {
    expect(() => run('open')).toThrow('No active project')
  })

  it('recent shows used projects', () => {
    run(`add ${projDir}`)
    run(`use my-project`)
    const output = run('recent')
    expect(output).toContain('my-project')
  })

  it('pin and unpin', () => {
    run(`add ${projDir}`)
    expect(run('pin my-project')).toContain('Pinned: my-project')
    expect(run('unpin my-project')).toContain('Unpinned: my-project')
  })

  it('scan discovers and adds projects', () => {
    const output = run(`scan ${dir} --depth 2`)
    expect(output).toContain('found 1 project(s)')
    expect(output).toContain(projDir)
  })

  it('stats shows session stats', () => {
    run(`add ${projDir}`)
    const output = run(`stats my-project`)
    expect(output).toContain('Sessions:     1')
    expect(output).toContain('$0.0100')
  })

  it('remove deletes a project', () => {
    run(`add ${projDir}`)
    expect(run(`remove my-project`)).toContain('Removed: my-project')
  })

  it('health reports status', () => {
    const output = run('health')
    const body = JSON.parse(output) as { status: string; projects: number; opencodeDbExists: boolean }
    expect(body.status).toBe('ok')
    expect(body.projects).toBe(0)
    expect(body.opencodeDbExists).toBe(true)
  })
})