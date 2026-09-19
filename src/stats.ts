// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

/**
 * Session statistics per project — read from OpenCode's SQLite database.
 */

import { openDb } from './sqlite.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface ProjectStats {
  directory: string
  sessions: number
  totalCost: number
  totalTokens: number
  lastActivity: number
}

export function defaultDbPath(): string {
  return process.env['OPENCODE_DB_PATH'] ?? join(homedir(), '.local', 'share', 'opencode', 'opencode.db')
}

/**
 * Query session stats for a project directory.
 * Matches the exact directory plus anything under it (subtree),
 * so sessions run from project subdirectories still count.
 * Throws if the OpenCode database does not exist.
 */
export function getProjectStats(dbPath: string, directory: string): ProjectStats {
  if (!existsSync(dbPath)) {
    throw new Error(`OpenCode database not found: ${dbPath}`)
  }
  const db = openDb(dbPath, true)
  try {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS sessions,
                COALESCE(SUM(cost), 0) AS total_cost,
                COALESCE(SUM(tokens_input + tokens_output), 0) AS total_tokens,
                COALESCE(MAX(time_updated), 0) AS last_activity
         FROM session WHERE directory = ? OR directory LIKE ? ESCAPE '\\'`,
      )
      .get(directory, `${escapeLike(directory)}/%`) as Record<string, unknown>

    return {
      directory,
      sessions: Number(row['sessions'] ?? 0),
      totalCost: Number(row['total_cost'] ?? 0),
      totalTokens: Number(row['total_tokens'] ?? 0),
      lastActivity: Number(row['last_activity'] ?? 0),
    }
  } finally {
    db.close()
  }
}

/** Escape LIKE wildcards in a directory path */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, m => `\\${m}`)
}

/** Total stats across all sessions in the database */
export function getTotalStats(dbPath: string): ProjectStats {
  if (!existsSync(dbPath)) {
    throw new Error(`OpenCode database not found: ${dbPath}`)
  }
  const db = openDb(dbPath, true)
  try {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS sessions,
                COALESCE(SUM(cost), 0) AS total_cost,
                COALESCE(SUM(tokens_input + tokens_output), 0) AS total_tokens,
                COALESCE(MAX(time_updated), 0) AS last_activity
         FROM session`,
      )
      .get() as Record<string, unknown>

    return {
      directory: '*',
      sessions: Number(row['sessions'] ?? 0),
      totalCost: Number(row['total_cost'] ?? 0),
      totalTokens: Number(row['total_tokens'] ?? 0),
      lastActivity: Number(row['last_activity'] ?? 0),
    }
  } finally {
    db.close()
  }
}