import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { scanProjects, isProject } from '../src/scan.js'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'terminalforge-scan-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('isProject', () => {
  it('detects opencode.jsonc', () => {
    const d = join(dir, 'a')
    mkdirSync(d)
    writeFileSync(join(d, 'opencode.jsonc'), '{}')
    expect(isProject(d)).toBe(true)
  })

  it('detects AGENTS.md', () => {
    const d = join(dir, 'b')
    mkdirSync(d)
    writeFileSync(join(d, 'AGENTS.md'), '# rules')
    expect(isProject(d)).toBe(true)
  })

  it('detects .opencode directory', () => {
    const d = join(dir, 'c')
    mkdirSync(join(d, '.opencode'), { recursive: true })
    expect(isProject(d)).toBe(true)
  })

  it('returns false for plain directories', () => {
    const d = join(dir, 'plain')
    mkdirSync(d)
    expect(isProject(d)).toBe(false)
  })
})

describe('scanProjects', () => {
  it('finds projects at the root', () => {
    const d = join(dir, 'proj')
    mkdirSync(d)
    writeFileSync(join(d, 'opencode.jsonc'), '{}')
    const found = scanProjects(dir, 1)
    expect(found).toContain(d)
  })

  it('finds nested projects up to depth', () => {
    const nested = join(dir, 'deep', 'inner', 'proj')
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(nested, 'AGENTS.md'), '# rules')
    const found = scanProjects(dir, 3)
    expect(found).toContain(nested)
  })

  it('skips node_modules', () => {
    const nm = join(dir, 'node_modules', 'pkg')
    mkdirSync(nm, { recursive: true })
    writeFileSync(join(nm, 'opencode.jsonc'), '{}')
    const found = scanProjects(dir, 3)
    expect(found).not.toContain(nm)
  })

  it('returns empty for no projects', () => {
    mkdirSync(join(dir, 'plain'))
    expect(scanProjects(dir, 3)).toHaveLength(0)
  })

  it('does not descend into project dirs', () => {
    const proj = join(dir, 'proj')
    mkdirSync(join(proj, 'sub'), { recursive: true })
    writeFileSync(join(proj, 'opencode.jsonc'), '{}')
    writeFileSync(join(proj, 'sub', 'AGENTS.md'), '# x')
    const found = scanProjects(dir, 3)
    expect(found).toContain(proj)
    expect(found).not.toContain(join(proj, 'sub'))
  })
})