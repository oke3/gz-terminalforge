import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { ProjectRegistry } from '../src/projects.js'
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let dir: string
let registry: ProjectRegistry
let projA: string
let projB: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'terminalforge-projects-'))
  registry = new ProjectRegistry(dir)
  projA = join(dir, 'project-a')
  projB = join(dir, 'project-b')
  mkdirSync(projA)
  mkdirSync(projB)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('ProjectRegistry', () => {
  it('starts empty', () => {
    expect(registry.getAll()).toHaveLength(0)
    expect(registry.getMeta().count).toBe(0)
  })

  it('adds a project', () => {
    const p = registry.add(projA)
    expect(p.name).toBe('project-a')
    expect(p.directory).toBe(projA)
    expect(registry.getAll()).toHaveLength(1)
  })

  it('add is idempotent by directory', () => {
    registry.add(projA)
    registry.add(projA)
    expect(registry.getAll()).toHaveLength(1)
  })

  it('add resolves relative paths to absolute', () => {
    const p = registry.add('project-a')
    expect(p.directory.startsWith('/')).toBe(true)
    expect(p.name).toBe('project-a')
  })

  it('removes a project by directory', () => {
    registry.add(projA)
    expect(registry.remove(projA)).toBe(true)
    expect(registry.getAll()).toHaveLength(0)
  })

  it('removes a project by name', () => {
    registry.add(projA)
    expect(registry.remove('project-a')).toBe(true)
    expect(registry.getAll()).toHaveLength(0)
  })

  it('remove returns false for unknown', () => {
    expect(registry.remove('nope')).toBe(false)
  })

  it('find by directory or name', () => {
    registry.add(projA)
    expect(registry.find('project-a')?.directory).toBe(projA)
    expect(registry.find(projA)?.name).toBe('project-a')
    expect(registry.find('nope')).toBeUndefined()
  })

  it('use sets active and touches lastUsedAt', () => {
    registry.add(projA)
    registry.use('project-a')
    const active = registry.getActive()
    expect(active?.directory).toBe(projA)
    expect(active?.lastUsedAt).toBeGreaterThan(0)
  })

  it('use returns undefined for unknown', () => {
    expect(registry.use('nope')).toBeUndefined()
  })

  it('recent sorts by lastUsedAt desc', async () => {
    registry.add(projA)
    registry.add(projB)
    registry.use('project-a')
    await new Promise(r => setTimeout(r, 5))
    registry.use('project-b')
    const recent = registry.recent(5)
    expect(recent[0]!.name).toBe('project-b')
    expect(recent[1]!.name).toBe('project-a')
  })

  it('pin and unpin', () => {
    registry.add(projA)
    registry.setPinned('project-a', true)
    expect(registry.find('project-a')?.pinned).toBe(true)
    registry.setPinned('project-a', false)
    expect(registry.find('project-a')?.pinned).toBe(false)
  })

  it('persists across instances', () => {
    registry.add(projA)
    registry.use('project-a')
    const registry2 = new ProjectRegistry(dir)
    expect(registry2.getAll()).toHaveLength(1)
    expect(registry2.getActive()?.directory).toBe(projA)
  })

  it('reset clears everything', () => {
    registry.add(projA)
    registry.reset()
    expect(registry.getAll()).toHaveLength(0)
    expect(registry.getActive()).toBeUndefined()
  })
})