/**
 * Project registry — tracks OpenCode projects in a JSONL store.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join, basename, resolve } from 'node:path'
import { homedir } from 'node:os'

export interface Project {
  name: string
  directory: string
  addedAt: number
  lastUsedAt: number
  pinned: boolean
}

export interface RegistryMeta {
  updatedAt: number
  active: string | null
  count: number
}

export class ProjectRegistry {
  private dir: string
  private projectsPath: string
  private metaPath: string

  constructor(dataDir?: string) {
    this.dir = dataDir ?? process.env['TERMINALFORGE_DATA_DIR'] ?? join(homedir(), '.terminalforge')
    this.projectsPath = join(this.dir, 'projects.jsonl')
    this.metaPath = join(this.dir, 'meta.json')
  }

  private ensureDir(): void {
    mkdirSync(this.dir, { recursive: true })
  }

  private readLines(path: string): string[] {
    if (!existsSync(path)) return []
    return readFileSync(path, 'utf-8').split('\n').filter(l => l.trim().length > 0)
  }

  private writeMeta(active?: string | null): void {
    // undefined = keep current active, null = clear, string = set
    const current = active === undefined ? (this.getActive()?.directory ?? null) : active
    const meta: RegistryMeta = {
      updatedAt: Date.now(),
      active: current,
      count: this.getAll().length,
    }
    writeFileSync(this.metaPath, JSON.stringify(meta) + '\n')
  }

  /** Add a project to the registry (idempotent by directory) */
  add(directory: string): Project {
    const resolved = resolve(directory)
    const existing = this.getByDirectory(resolved)
    if (existing) return existing

    this.ensureDir()
    const project: Project = {
      name: basename(resolved) || resolved,
      directory: resolved,
      addedAt: Date.now(),
      lastUsedAt: 0,
      pinned: false,
    }
    appendFileSync(this.projectsPath, JSON.stringify(project) + '\n')
    this.writeMeta()
    return project
  }

  /** Remove a project by directory or name. Returns true if removed. */
  remove(ref: string): boolean {
    const project = this.find(ref)
    if (!project) return false

    const wasActive = this.getActive()?.directory === project.directory
    const remaining = this.getAll().filter(p => p.directory !== project.directory)
    this.ensureDir()
    writeFileSync(this.projectsPath, remaining.map(p => JSON.stringify(p)).join('\n') + (remaining.length ? '\n' : ''))
    this.writeMeta(wasActive ? null : undefined)
    return true
  }

  getAll(): Project[] {
    return this.readLines(this.projectsPath).map(l => JSON.parse(l) as Project)
  }

  getByDirectory(directory: string): Project | undefined {
    const resolved = resolve(directory)
    return this.getAll().find(p => p.directory === resolved)
  }

  /** Find by directory or name */
  find(ref: string): Project | undefined {
    const byDir = this.getByDirectory(ref)
    if (byDir) return byDir
    return this.getAll().find(p => p.name === ref)
  }

  /** Set the active project */
  use(ref: string): Project | undefined {
    const project = this.find(ref)
    if (!project) return undefined
    this.touch(project.directory)
    this.writeMeta(project.directory)
    return this.getByDirectory(project.directory)
  }

  /** Mark a project as recently used */
  touch(directory: string): void {
    const all = this.getAll()
    const idx = all.findIndex(p => p.directory === resolve(directory))
    if (idx < 0) return
    all[idx] = { ...all[idx]!, lastUsedAt: Date.now() }
    this.ensureDir()
    writeFileSync(this.projectsPath, all.map(p => JSON.stringify(p)).join('\n') + '\n')
  }

  getActive(): Project | undefined {
    if (!existsSync(this.metaPath)) return undefined
    try {
      const meta = JSON.parse(readFileSync(this.metaPath, 'utf-8')) as RegistryMeta
      if (!meta.active) return undefined
      return this.getByDirectory(meta.active)
    } catch {
      return undefined
    }
  }

  /** Recently used projects, most recent first */
  recent(limit = 5): Project[] {
    return this.getAll()
      .filter(p => p.lastUsedAt > 0)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, limit)
  }

  /** Pin or unpin a project */
  setPinned(ref: string, pinned: boolean): Project | undefined {
    const project = this.find(ref)
    if (!project) return undefined
    const all = this.getAll()
    const idx = all.findIndex(p => p.directory === project.directory)
    all[idx] = { ...all[idx]!, pinned }
    this.ensureDir()
    writeFileSync(this.projectsPath, all.map(p => JSON.stringify(p)).join('\n') + '\n')
    this.writeMeta()
    return all[idx]
  }

  getMeta(): RegistryMeta {
    if (existsSync(this.metaPath)) {
      try {
        return JSON.parse(readFileSync(this.metaPath, 'utf-8')) as RegistryMeta
      } catch {
        // fall through to computed meta
      }
    }
    return { updatedAt: 0, active: null, count: this.getAll().length }
  }

  /** Reset the registry */
  reset(): void {
    this.ensureDir()
    writeFileSync(this.projectsPath, '')
    writeFileSync(this.metaPath, JSON.stringify({ updatedAt: Date.now(), active: null, count: 0 }) + '\n')
  }
}