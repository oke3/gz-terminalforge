// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

/**
 * Project discovery — scan a directory tree for OpenCode projects.
 */

import { readdirSync, existsSync, statSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', '.next', 'build', 'out', '.cache',
  '.venv', 'venv', '__pycache__', 'target', 'vendor', 'coverage',
])

/** Is a directory an OpenCode project? */
export function isProject(dir: string): boolean {
  return (
    existsSync(join(dir, 'opencode.jsonc')) ||
    existsSync(join(dir, 'opencode.json')) ||
    existsSync(join(dir, 'AGENTS.md')) ||
    existsSync(join(dir, '.opencode'))
  )
}

/**
 * Scan a directory tree (up to maxDepth) for OpenCode projects.
 * Returns absolute paths of discovered project directories.
 */
export function scanProjects(root: string, maxDepth = 3): string[] {
  const found: string[] = []
  const seen = new Set<string>()

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth) return
    if (seen.has(dir)) return
    seen.add(dir)

    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue
      const full = join(dir, entry)
      let isDir = false
      try {
        isDir = statSync(full).isDirectory()
      } catch {
        continue
      }
      if (!isDir) continue

      if (isProject(full)) {
        found.push(full)
      } else {
        walk(full, depth + 1)
      }
    }
  }

  walk(resolve(root), 0)
  return found.sort((a, b) => basename(a).localeCompare(basename(b)))
}