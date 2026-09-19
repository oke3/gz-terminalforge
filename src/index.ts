// Copyright (c) 2026 Ground Zero LLC. All rights reserved.

/**
 * @ground-zero-llc/gz-terminalforge — terminal workspace for OpenCode projects.
 *
 * @example
 * ```typescript
 * import { ProjectRegistry, getProjectStats } from '@ground-zero-llc/gz-terminalforge'
 *
 * const registry = new ProjectRegistry('./data')
 * registry.add('./my-project')
 * registry.use('./my-project')
 *
 * const stats = getProjectStats('~/.local/share/opencode/opencode.db', '/abs/path/my-project')
 * ```
 */

export { ProjectRegistry, type Project, type RegistryMeta } from './projects.js'
export { getProjectStats, getTotalStats, defaultDbPath, type ProjectStats } from './stats.js'
export { scanProjects, isProject } from './scan.js'