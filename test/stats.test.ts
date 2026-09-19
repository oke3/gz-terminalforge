// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { openDb } from '../src/sqlite.js'
import { getProjectStats, getTotalStats } from '../src/stats.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let dir: string
let dbPath: string

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
  const insert = sqlite.prepare(`
    INSERT INTO session (id, project_id, slug, directory, title, version, cost, tokens_input, tokens_output, agent, model, time_created, time_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insert.run('s1', 'p1', 's1', '/tmp/proj-a', 'One', '1.0', 0.01, 100, 50, 'build', 'm1', 1_700_000_000_000, 1_700_000_000_100)
  insert.run('s2', 'p1', 's2', '/tmp/proj-a', 'Two', '1.0', 0.02, 200, 100, 'build', 'm1', 1_700_000_000_200, 1_700_000_000_300)
  insert.run('s3', 'p2', 's3', '/tmp/proj-b', 'Three', '1.0', 0.05, 500, 250, 'build', 'm2', 1_700_000_000_400, 1_700_000_000_500)
  insert.run('s4', 'p1', 's4', '/tmp/proj-a/sub/deep', 'Four', '1.0', 0.005, 50, 25, 'build', 'm1', 1_700_000_000_600, 1_700_000_000_700)
  sqlite.close()
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'terminalforge-stats-'))
  dbPath = join(dir, 'opencode.db')
  createFixtureDb(dbPath)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('getProjectStats', () => {
  it('aggregates sessions including subdirectories', () => {
    const stats = getProjectStats(dbPath, '/tmp/proj-a')
    // exact (s1, s2) + subtree (s4)
    expect(stats.sessions).toBe(3)
    expect(stats.totalCost).toBeCloseTo(0.035)
    expect(stats.totalTokens).toBe(525)
    expect(stats.lastActivity).toBe(1_700_000_000_700)
  })

  it('handles directories with no sessions', () => {
    const stats = getProjectStats(dbPath, '/tmp/proj-empty')
    expect(stats.sessions).toBe(0)
    expect(stats.totalCost).toBe(0)
    expect(stats.totalTokens).toBe(0)
    expect(stats.lastActivity).toBe(0)
  })

  it('throws for missing database', () => {
    expect(() => getProjectStats(join(dir, 'missing.db'), '/tmp/proj-a')).toThrow()
  })
})

describe('getTotalStats', () => {
  it('aggregates across all sessions', () => {
    const stats = getTotalStats(dbPath)
    expect(stats.sessions).toBe(4)
    expect(stats.totalCost).toBeCloseTo(0.085)
    expect(stats.totalTokens).toBe(1275)
  })
})