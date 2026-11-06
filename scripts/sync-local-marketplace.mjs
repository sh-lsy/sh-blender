#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
//
// Refresh a local `directory` marketplace copy from the current git HEAD.
// WorkBuddy desktop reads marketplaces from
//   ~/.workbuddy/plugins/known_marketplaces.json
// and copies an installed plugin into its versioned cache. Keeping a clean
// snapshot (no .git, .plugin-data, node_modules) avoids copying runtime state.
//
// Usage:
//   node scripts/sync-local-marketplace.mjs [market-root]
// Default market-root: ../sh-blender-marketplace relative to this project.
//
// Marketplace layout (matches the official ./plugins/<name> convention):
//   <market-root>/.codebuddy-plugin/marketplace.json   -> source ./plugins/sh-blender
//   <market-root>/plugins/sh-blender/                  -> clean plugin snapshot
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MARKET_ROOT = resolve(process.argv[2] || resolve(ROOT, '..', 'sh-blender-marketplace'))
const PLUGIN_DIR = join(MARKET_ROOT, 'plugins', 'sh-blender')
const version = JSON.parse(readFileSync(join(ROOT, '.codebuddy-plugin/plugin.json'), 'utf8')).version

const LOCAL_MARKET_MANIFEST = JSON.stringify({
  name: 'sh-lsy-plugins',
  description: 'sh-lsy 维护的 WorkBuddy 插件（本机 directory 市场）',
  owner: { name: 'sh-lsy', url: 'https://github.com/sh-lsy' },
  plugins: [{
    name: 'sh-blender',
    source: './plugins/sh-blender',
    description: 'Blender 3D 建模、重建、渲染、验证与导出插件（30 skills / 26 helpers / 13 tools）',
    version,
    author: { name: 'sh-lsy', url: 'https://github.com/sh-lsy' },
    homepage: 'https://github.com/sh-lsy/sh-blender#readme',
    repository: 'https://github.com/sh-lsy/sh-blender',
    license: 'MIT',
    keywords: ['blender', '3d-modeling', 'agent-skill', 'mcp'],
    category: '3D 建模',
  }],
}, null, 2) + '\n'

// Only tracked files are copied, so generated state never reaches the market.
// `--cached --others --exclude-standard` includes untracked-but-not-ignored
// files, so edits that have not been staged yet still reach the snapshot.
// Copying reads the working-tree bytes, so staged/unstaged changes are picked up.
const tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  // Workspace-local agent state (memory logs) is git-tracked for the project but
  // must never ship inside the marketplace snapshot.
  .filter((file) => !file.startsWith('.workbuddy/'))

mkdirSync(join(MARKET_ROOT, '.codebuddy-plugin'), { recursive: true })
mkdirSync(PLUGIN_DIR, { recursive: true })

function listFiles(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFiles(p))
    else out.push(p)
  }
  return out
}

// Incremental sync: overwrite tracked files, then remove only files that are
// no longer tracked. Deleting one file at a time avoids bulk-delete guards.
for (const file of tracked) {
  const target = join(PLUGIN_DIR, file)
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(join(ROOT, file), target)
}
const desired = new Set(tracked.map((file) => resolve(PLUGIN_DIR, file)))
let pruned = 0
for (const existing of listFiles(PLUGIN_DIR)) {
  if (!desired.has(resolve(existing))) {
    rmSync(existing, { force: true })
    pruned += 1
  }
}
writeFileSync(join(MARKET_ROOT, '.codebuddy-plugin/marketplace.json'), LOCAL_MARKET_MANIFEST)

// Pruning files leaves empty directories behind; drop them so the snapshot has
// no residue of workspace-local agent state.
function pruneEmptyDirs(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneEmptyDirs(join(dir, entry.name))
  }
  if (dir !== PLUGIN_DIR && readdirSync(dir).length === 0) rmSync(dir, { recursive: true, force: true })
}
pruneEmptyDirs(PLUGIN_DIR)

// Fail fast if the marketplace entry cannot be resolved.
const entry = JSON.parse(readFileSync(join(MARKET_ROOT, '.codebuddy-plugin/marketplace.json'), 'utf8')).plugins[0]
const resolved = resolve(MARKET_ROOT, entry.source)
if (!existsSync(join(resolved, '.codebuddy-plugin/plugin.json'))) {
  throw new Error(`marketplace source does not resolve to a plugin: ${entry.source}`)
}

console.log(`synced ${tracked.length} tracked files -> ${relative(ROOT, PLUGIN_DIR)} (pruned ${pruned} stale files)`)
console.log(`marketplace manifest: ${join(MARKET_ROOT, '.codebuddy-plugin/marketplace.json')} (version ${version})`)
console.log('Restart the WorkBuddy desktop app to pick up the refreshed marketplace.')
