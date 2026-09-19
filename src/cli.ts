// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

/**
 * terminalforge CLI — terminal workspace for OpenCode projects.
 */

import { ProjectRegistry } from './projects.js'
import { getProjectStats, getTotalStats, defaultDbPath } from './stats.js'
import { scanProjects, isProject } from './scan.js'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

function usage(): string {
  return `terminalforge — terminal workspace for OpenCode projects

Usage:
  terminalforge add <dir>                     Add a project to the registry
  terminalforge remove <dir|name>             Remove a project
  terminalforge list                          List registry projects
  terminalforge use <dir|name>                Set the active project
  terminalforge open [dir|name] [--dry-run]   Launch opencode in a project
  terminalforge recent                        Show recently used projects
  terminalforge pin <dir|name>                Pin a project
  terminalforge unpin <dir|name>              Unpin a project
  terminalforge scan <dir> [--depth N]        Discover and add projects
  terminalforge stats [dir|name]              Session stats from the OpenCode DB
  terminalforge health                        Check registry and database status

Data directory: ~/.terminalforge (override with TERMINALFORGE_DATA_DIR)
OpenCode DB:    ~/.local/share/opencode/opencode.db (override with OPENCODE_DB_PATH)
OpenCode bin:   opencode (override with OPENCODE_BIN)
`
}

function getArg(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name)
}

function fmtCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

function fmtTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`
  return String(tokens)
}

function fmtTime(ms: number): string {
  if (!ms) return 'never'
  return new Date(ms).toISOString().slice(0, 10)
}

function printProject(p: ReturnType<ProjectRegistry['getAll']>[number], active: boolean, statsText: string): void {
  const pin = p.pinned ? ' [pin]' : ''
  const act = active ? ' *' : ''
  console.log(`${act} ${p.name}${pin} — ${p.directory}`)
  if (statsText) console.log(`    ${statsText}`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const cmd = args[0] ?? ''

  if (cmd === '' || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(usage())
    return
  }

  const registry = new ProjectRegistry()
  const dbPath = defaultDbPath()

  switch (cmd) {
    case 'add': {
      const dir = args[1]
      if (!dir) {
        console.error('Usage: terminalforge add <dir>')
        process.exitCode = 1
        return
      }
      if (!existsSync(dir)) {
        console.error(`Directory not found: ${dir}`)
        process.exitCode = 1
        return
      }
      const project = registry.add(dir)
      console.log(`Added: ${project.name} (${project.directory})`)
      return
    }

    case 'remove': {
      const ref = args[1]
      if (!ref) {
        console.error('Usage: terminalforge remove <dir|name>')
        process.exitCode = 1
        return
      }
      const removed = registry.remove(ref)
      if (removed) {
        console.log(`Removed: ${ref}`)
      } else {
        console.error(`Not found: ${ref}`)
        process.exitCode = 1
      }
      return
    }

    case 'list': {
      const projects = registry.getAll()
      if (projects.length === 0) {
        console.log('No projects in registry. Add one: terminalforge add <dir>')
        return
      }
      const active = registry.getActive()
      const dbOk = existsSync(dbPath)
      console.log(`TerminalForge — ${projects.length} project(s)`)
      if (dbOk) {
        try {
          const total = getTotalStats(dbPath)
          console.log(`Total: ${total.sessions} sessions, ${fmtCost(total.totalCost)}, ${fmtTokens(total.totalTokens)} tokens\n`)
        } catch {
          console.log('')
        }
      } else {
        console.log('(OpenCode DB not found — no session stats)\n')
      }
      for (const p of projects) {
        let statsText = ''
        if (dbOk) {
          try {
            const s = getProjectStats(dbPath, p.directory)
            statsText = `${s.sessions} sessions, ${fmtCost(s.totalCost)}, ${fmtTokens(s.totalTokens)} tokens, last ${fmtTime(s.lastActivity)}`
          } catch {
            statsText = 'stats unavailable'
          }
        }
        printProject(p, active?.directory === p.directory, statsText)
      }
      return
    }

    case 'use': {
      const ref = args[1]
      if (!ref) {
        console.error('Usage: terminalforge use <dir|name>')
        process.exitCode = 1
        return
      }
      const project = registry.use(ref)
      if (!project) {
        console.error(`Not found: ${ref}. Add it first: terminalforge add ${ref}`)
        process.exitCode = 1
        return
      }
      console.log(`Active: ${project.name} (${project.directory})`)
      return
    }

    case 'open': {
      const ref = args[1]
      const dryRun = hasFlag(args, '--dry-run')
      let project = ref ? registry.find(ref) : registry.getActive()
      if (!project) {
        console.error(ref ? `Not found: ${ref}` : 'No active project. Use: terminalforge use <dir>')
        process.exitCode = 1
        return
      }
      const bin = process.env['OPENCODE_BIN'] ?? 'opencode'
      if (dryRun) {
        console.log(`Would run: ${bin} (cwd: ${project.directory})`)
        return
      }
      registry.touch(project.directory)
      const child = spawn(bin, [], { cwd: project.directory, detached: true, stdio: 'ignore' })
      child.unref()
      console.log(`Launched ${bin} in ${project.name} (${project.directory})`)
      return
    }

    case 'recent': {
      const recent = registry.recent()
      if (recent.length === 0) {
        console.log('No recent projects yet. Use: terminalforge use <dir> or terminalforge open <dir>')
        return
      }
      console.log('Recent projects:')
      for (const p of recent) {
        console.log(`  ${p.name} — ${p.directory} (${fmtTime(p.lastUsedAt)})`)
      }
      return
    }

    case 'pin': {
      const ref = args[1]
      if (!ref) {
        console.error('Usage: terminalforge pin <dir|name>')
        process.exitCode = 1
        return
      }
      const project = registry.setPinned(ref, true)
      if (!project) {
        console.error(`Not found: ${ref}`)
        process.exitCode = 1
        return
      }
      console.log(`Pinned: ${project.name}`)
      return
    }

    case 'unpin': {
      const ref = args[1]
      if (!ref) {
        console.error('Usage: terminalforge unpin <dir|name>')
        process.exitCode = 1
        return
      }
      const project = registry.setPinned(ref, false)
      if (!project) {
        console.error(`Not found: ${ref}`)
        process.exitCode = 1
        return
      }
      console.log(`Unpinned: ${project.name}`)
      return
    }

    case 'scan': {
      const root = args[1] ?? cwd()
      if (!existsSync(root)) {
        console.error(`Directory not found: ${root}`)
        process.exitCode = 1
        return
      }
      const depth = Number(getArg(args, '--depth') ?? '3')
      const found = scanProjects(root, depth)
      if (found.length === 0) {
        console.log(`No OpenCode projects found under ${root}`)
        return
      }
      let added = 0
      for (const dir of found) {
        const before = registry.getByDirectory(dir)
        registry.add(dir)
        if (!before) added++
      }
      console.log(`Scanned ${root}: found ${found.length} project(s), added ${added} new (registry now has ${registry.getAll().length})`)
      for (const dir of found) {
        console.log(`  ${dir}`)
      }
      return
    }

    case 'stats': {
      const ref = args[1]
      const project = ref ? registry.find(ref) : registry.getActive()
      if (!project) {
        console.error(ref ? `Not found: ${ref}` : 'No active project. Use: terminalforge use <dir>')
        process.exitCode = 1
        return
      }
      if (!existsSync(dbPath)) {
        console.error(`OpenCode database not found: ${dbPath}`)
        process.exitCode = 1
        return
      }
      try {
        const s = getProjectStats(dbPath, project.directory)
        console.log(`Stats for ${project.name} (${project.directory})`)
        console.log(`  Sessions:     ${s.sessions}`)
        console.log(`  Total cost:   ${fmtCost(s.totalCost)}`)
        console.log(`  Total tokens: ${fmtTokens(s.totalTokens)}`)
        console.log(`  Last activity: ${fmtTime(s.lastActivity)}`)
      } catch (err) {
        console.error(String(err))
        process.exitCode = 1
      }
      return
    }

    case 'health': {
      const meta = registry.getMeta()
      const dbOk = existsSync(dbPath)
      console.log(JSON.stringify({
        status: 'ok',
        dataDir: process.env['TERMINALFORGE_DATA_DIR'] ?? resolve(process.env['HOME'] ?? '', '.terminalforge'),
        projects: meta.count,
        active: meta.active,
        opencodeDb: dbPath,
        opencodeDbExists: dbOk,
        opencodeBin: process.env['OPENCODE_BIN'] ?? 'opencode',
      }, null, 2))
      return
    }

    default: {
      console.error(`Unknown command: ${cmd}\n`)
      console.error(usage())
      process.exitCode = 1
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})