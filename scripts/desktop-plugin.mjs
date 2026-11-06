#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
//
// Install / update sh-blender directly into the WorkBuddy desktop app.
// The desktop app has no CLI: it reads
//   ~/.workbuddy/plugins/known_marketplaces.json   (market registry)
//   ~/.workbuddy/plugins/installed_plugins.json    (installed plugin + cache path)
//   ~/.workbuddy/settings.json                    (enabledPlugins)
// and loads the plugin from a versioned cache directory.
//
// Usage:
//   node scripts/desktop-plugin.mjs                 install / overwrite current version
//   node scripts/desktop-plugin.mjs --bump patch    bump 1.0.0 -> 1.0.1, then install
//   node scripts/desktop-plugin.mjs --bump minor    bump 1.0.0 -> 1.1.0, then install
//   node scripts/desktop-plugin.mjs --status        show current registration
//
// Best practice: fully quit WorkBuddy before running, then start it again.
// The desktop app rewrites these JSON files on startup, so editing them while
// it is running may be overwritten.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, copyFileSync, writeFileSync, cpSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PLUGINS = join(homedir(), '.workbuddy', 'plugins')
const SETTINGS = join(homedir(), '.workbuddy', 'settings.json')
const MARKET_ROOT = resolve(ROOT, '..', 'sh-blender-marketplace')
const SOURCE = join(MARKET_ROOT, 'plugins', 'sh-blender')

const pluginJsonPath = join(ROOT, '.codebuddy-plugin/plugin.json')
const marketJsonPath = join(ROOT, '.codebuddy-plugin/marketplace.json')
const packageJsonPath = join(ROOT, 'package.json')

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const writeJson = (p, value) => writeFileSync(p, JSON.stringify(value, null, 2) + '\n')
const stamp = () => new Date().toISOString()

const plugin = readJson(pluginJsonPath)
const pkg = readJson(packageJsonPath)
const market = readJson(marketJsonPath)
const NAME = plugin.name
const MARKET = market.name
const KEY = `${NAME}@${MARKET}`

function versions() {
  return {
    plugin: plugin.version,
    package: pkg.version,
    marketplace: market.plugins.find((p) => p.name === NAME)?.version,
  }
}

function assertVersions() {
  const v = versions()
  if (new Set(Object.values(v)).size !== 1) {
    throw new Error(`version mismatch: ${JSON.stringify(v)}. Align plugin.json, package.json and marketplace.json.`)
  }
  return v.plugin
}

function bump(version, kind) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (![major, minor, patch].every(Number.isInteger)) throw new Error(`not a semver version: ${version}`)
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function backup(p) {
  const target = `${p}.bak-sh-blender`
  if (!existsSync(target)) copyFileSync(p, target)
}

function listFiles(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...listFiles(p))
    else out.push(p)
  }
  return out
}

function syncMarketplace() {
  execFileSync(process.execPath, [join(ROOT, 'scripts/sync-local-marketplace.mjs'), MARKET_ROOT], { cwd: ROOT, stdio: 'inherit' })
}

const args = process.argv.slice(2)
const bumpIndex = args.indexOf('--bump')
const kind = bumpIndex >= 0 ? args[bumpIndex + 1] : null
if (kind && !['patch', 'minor', 'major'].includes(kind)) throw new Error('--bump expects patch|minor|major')

let version = assertVersions()
if (args.includes('--status')) {
  const installed = readJson(join(PLUGINS, 'installed_plugins.json')).plugins[KEY]
  const enabled = readJson(SETTINGS).enabledPlugins?.[KEY]
  const known = readJson(join(PLUGINS, 'known_marketplaces.json'))[MARKET]
  console.log(JSON.stringify({ projectVersion: version, marketRegistered: !!known, installed, enabled }, null, 2))
  process.exit(0)
}

if (kind) {
  version = bump(version, kind)
  plugin.version = version
  pkg.version = version
  market.plugins.find((p) => p.name === NAME).version = version
  writeJson(pluginJsonPath, plugin)
  writeJson(packageJsonPath, pkg)
  writeJson(marketJsonPath, market)
  console.log(`bumped version -> ${version}`)
}

// Guard against MCP configs the desktop host cannot substitute. Its
// PluginMcpProvider throws MissingPluginUserConfigError for an unset
// ${user_config.KEY} and skips the whole server; ${CODEBUDDY_PROJECT_DIR}
// is not substituted at all. Runtime values are injected as
// CODEBUDDY_PLUGIN_OPTION_* environment variables instead.
const mcpText = readFileSync(join(ROOT, '.mcp.json'), 'utf8')
for (const forbidden of ['${user_config.', '${CODEBUDDY_PROJECT_DIR}', '${CLAUDE_PROJECT_DIR}']) {
  if (mcpText.includes(forbidden)) {
    throw new Error(`.mcp.json contains ${forbidden} -> the desktop host would skip this MCP server. Use CODEBUDDY_PLUGIN_OPTION_* env vars and src/config.js defaults instead.`)
  }
}

// 1. Refresh the clean local marketplace snapshot.
syncMarketplace()
const marketManifest = readJson(join(MARKET_ROOT, '.codebuddy-plugin/marketplace.json'))
const entry = marketManifest.plugins.find((p) => p.name === NAME)
if (!entry || entry.version !== version) {
  throw new Error(`marketplace entry version mismatch: ${JSON.stringify(entry)}`)
}
if (!existsSync(join(SOURCE, '.codebuddy-plugin/plugin.json'))) {
  throw new Error(`plugin snapshot missing: ${SOURCE}`)
}

// 2. Copy into the versioned plugin cache.
const CACHE = join(PLUGINS, 'cache', MARKET, NAME, version)
mkdirSync(CACHE, { recursive: true })
cpSync(SOURCE, CACHE, { recursive: true, force: true })
console.log(`cache: ${CACHE} (${listFiles(CACHE).length} files)`)

// 3. Register as installed + enabled.
const installedPath = join(PLUGINS, 'installed_plugins.json')
const knownPath = join(PLUGINS, 'known_marketplaces.json')
for (const p of [installedPath, knownPath]) backup(p)

const installed = readJson(installedPath)
const previous = installed.plugins[KEY]?.[0]
installed.plugins[KEY] = [{
  scope: 'user',
  installPath: resolve(CACHE).replace(/\//g, '\\'),
  version,
  installedAt: previous?.installedAt ?? stamp(),
  lastUpdated: stamp(),
}]
writeJson(installedPath, installed)

const known = readJson(knownPath)
known[MARKET] = {
  manifestName: MARKET,
  type: 'directory',
  source: { source: 'directory', path: MARKET_ROOT.replace(/\//g, '\\') },
  installLocation: MARKET_ROOT.replace(/\//g, '\\'),
  description: `${MARKET} (local directory marketplace)`,
  lastUpdated: stamp(),
  autoUpdate: false,
  ...(known[MARKET] || {}),
}
writeJson(knownPath, known)

// Only touch settings.json when the plugin is not already enabled. This file
// is user-owned; rewriting it on every run is unnecessary and may be blocked.
const settings = readJson(SETTINGS)
settings.enabledPlugins = settings.enabledPlugins || {}
if (settings.enabledPlugins[KEY] !== true) {
  backup(SETTINGS)
  settings.enabledPlugins[KEY] = true
  writeJson(SETTINGS, settings)
  console.log(`enabled: ${KEY} = true`)
} else {
  console.log(`already enabled: ${KEY}`)
}

// 4. Verify.
const check = {
  market: !!readJson(knownPath)[MARKET],
  installed: readJson(installedPath).plugins[KEY]?.[0]?.version === version,
  enabled: readJson(SETTINGS).enabledPlugins[KEY] === true,
  manifest: existsSync(join(CACHE, '.codebuddy-plugin/plugin.json')),
  mcpConfig: existsSync(join(CACHE, '.mcp.json')),
  mcpServer: existsSync(join(CACHE, 'mcp/server.mjs')),
  skill: existsSync(join(CACHE, 'skills/sh-blender/SKILL.md')),
}
console.log('verify:', JSON.stringify(check))
if (Object.values(check).some((v) => v !== true)) throw new Error('registration incomplete')

console.log(`
Done. sh-blender ${version} is registered as installed + enabled.
Next: fully quit WorkBuddy and start it again (or try /reload-plugins in chat).
The "专家·技能·连接器 → 技能" page shows the SkillHub skill market; a native
plugin does not appear as a card there. The installed skill is named
"sh-blender", so the slash command is /sh-blender:sh-blender — or just ask the
agent to build a 3D model. Also verify the blender_status MCP tool.
`)
