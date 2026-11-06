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
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
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
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((f) => !f.startsWith('.codebuddy-plugin/'))

mkdirSync(join(MARKET_ROOT, '.codebuddy-plugin'), { recursive: true })
mkdirSync(PLUGIN_DIR, { recursive: true })
// Start from a clean snapshot so deleted source files do not linger.
rmSync(PLUGIN_DIR, { recursive: true, force: true })
mkdirSync(PLUGIN_DIR, { recursive: true })

for (const file of tracked) {
  const target = join(PLUGIN_DIR, file)
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(join(ROOT, file), target)
}
mkdirSync(join(PLUGIN_DIR, '.codebuddy-plugin'), { recursive: true })
copyFileSync(join(ROOT, '.codebuddy-plugin/plugin.json'), join(PLUGIN_DIR, '.codebuddy-plugin/plugin.json'))
writeFileSync(join(MARKET_ROOT, '.codebuddy-plugin/marketplace.json'), LOCAL_MARKET_MANIFEST)

// Fail fast if the marketplace entry cannot be resolved.
const entry = JSON.parse(readFileSync(join(MARKET_ROOT, '.codebuddy-plugin/marketplace.json'), 'utf8')).plugins[0]
const resolved = resolve(MARKET_ROOT, entry.source)
if (!existsSync(join(resolved, '.codebuddy-plugin/plugin.json'))) {
  throw new Error(`marketplace source does not resolve to a plugin: ${entry.source}`)
}

console.log(`synced ${tracked.length} tracked files -> ${relative(ROOT, PLUGIN_DIR)}`)
console.log(`marketplace manifest: ${join(MARKET_ROOT, '.codebuddy-plugin/marketplace.json')} (version ${version})`)
console.log('Restart the WorkBuddy desktop app to pick up the refreshed marketplace.')
