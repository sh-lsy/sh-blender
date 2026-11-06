#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
// Structure, metadata, licensing and host-coupling gate for sh-blender.
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createToolRegistry } from '../src/tools.js'
import { HELPER_CATALOG } from '../src/helper-catalog.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_ROOT = join(ROOT, 'skills', 'sh-blender')
const failures = []
const notes = []
const check = (label, fn) => {
  try { fn(); notes.push(`PASS  ${label}`) }
  catch (cause) { failures.push(`FAIL  ${label}: ${cause instanceof Error ? cause.message : String(cause)}`) }
}
const read = (p) => readFileSync(p, 'utf8')
const json = (p) => JSON.parse(read(join(ROOT, p)))

const SKIP_DIRS = new Set(['.git', 'node_modules', '.plugin-data', '.venv', '__pycache__', 'artifacts'])

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...walk(p))
    } else out.push(p)
  }
  return out
}

// 1. Required files -----------------------------------------------------------
const required = [
  'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'README.zh-CN.md',
  'CHANGELOG.md', 'package.json', '.mcp.json', '.codebuddy-plugin/plugin.json',
  '.codebuddy-plugin/marketplace.json', 'requirements-analysis.txt',
  'mcp/server.mjs', 'src/config.js', 'src/tools.js', 'src/jsonrpc.js',
  'src/cli.js', 'src/helper-catalog.js', 'src/upstream-runtime.js',
  'src/vendor/dsh-tools.js', 'src/vendor/schemastery.js',
  'scripts/sh_blender_driver.py', 'scripts/sh_blender_helper_driver.py',
  'scripts/setup-analysis.js', 'bin/sh-blender', 'bin/sh-blender.cmd',
  'skills/sh-blender/SKILL.md', 'skills/sh-blender/LICENSE',
  'skills/sh-blender/UPSTREAM_LICENSE',
  'skills/sh-blender/references/integration.md',
  'skills/sh-blender/references/upstream.md',
]
check('required files present', () => {
  const missing = required.filter((p) => !existsSync(join(ROOT, p)))
  assert.deepEqual(missing, [])
})

// 2. JSON metadata ------------------------------------------------------------
check('JSON manifests parse and versions agree', () => {
  const pkg = json('package.json')
  const plugin = json('.codebuddy-plugin/plugin.json')
  const market = json('.codebuddy-plugin/marketplace.json')
  const mcp = json('.mcp.json')
  assert.equal(pkg.private, true, 'package.json must be private')
  assert.deepEqual(pkg.dependencies ?? {}, {}, 'runtime dependencies must be empty')
  assert.equal(pkg.version, plugin.version)
  assert.equal(plugin.name, 'sh-blender')
  assert.equal(plugin.author.name, 'sh-lsy')
  assert.equal(plugin.repository, 'https://github.com/sh-lsy/sh-blender')
  assert.equal(plugin.mcpServers, './.mcp.json')
  assert.equal(Object.hasOwn(plugin, 'skills'), false, 'do not set skills: auto-discovery is required')
  assert.equal(market.plugins[0].version, plugin.version)
  assert.equal(market.plugins[0].source, './')
  assert.ok(mcp.mcpServers['sh-blender'], 'MCP server key sh-blender missing')
  assert.match(mcp.mcpServers['sh-blender'].args[0], /CODEBUDDY_PLUGIN_ROOT/u)
})

// 3. Counts -------------------------------------------------------------------
check('1 SKILL.md + 29 MODULE.md', () => {
  const skills = walk(SKILL_ROOT).filter((p) => p.endsWith('SKILL.md'))
  const modules = walk(SKILL_ROOT).filter((p) => p.endsWith('MODULE.md'))
  assert.equal(skills.length, 1, `expected 1 SKILL.md, got ${skills.length}`)
  assert.equal(modules.length, 29, `expected 29 MODULE.md, got ${modules.length}`)
})

check('26 helper scripts and 26 catalog entries', () => {
  const scripts = walk(SKILL_ROOT).filter((p) => p.endsWith('.py'))
  assert.equal(scripts.length, 26, `expected 26 helper .py, got ${scripts.length}`)
  assert.equal(HELPER_CATALOG.length, 26)
  assert.equal(new Set(HELPER_CATALOG.map((h) => h.name)).size, 26)
})

check('every catalog script resolves inside the skill root', () => {
  for (const helper of HELPER_CATALOG) {
    assert.ok(existsSync(join(SKILL_ROOT, helper.script)), `missing ${helper.script}`)
    assert.ok(['python', 'blender'].includes(helper.runtime), `bad runtime ${helper.name}`)
  }
})

check('13 tool definitions with valid inputSchema', () => {
  const registry = createToolRegistry()
  assert.equal(registry.names.length, 13, `expected 13 tools, got ${registry.names.length}`)
  for (const tool of registry.definitions()) {
    assert.equal(tool.inputSchema.type, 'object', `${tool.name}: bad inputSchema`)
    assert.ok(tool.name.startsWith('blender_'), `${tool.name}: bad name`)
  }
})

// 4. Frontmatter --------------------------------------------------------------
const frontmatterOf = (file) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/u.exec(read(file))
  assert.ok(m, `${relative(ROOT, file)}: missing frontmatter`)
  return m[1].split(/\r?\n/u).filter(Boolean).map((l) => l.split(':')[0])
}

check('top-level SKILL.md frontmatter', () => {
  const raw = read(join(SKILL_ROOT, 'SKILL.md'))
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/u.exec(raw)
  assert.ok(m, 'missing frontmatter')
  const name = /^name:\s*(.+)$/mu.exec(m[1])?.[1]?.trim()
  const description = /^description:\s*(.+)$/mu.exec(m[1])?.[1]?.trim()
  assert.equal(name, 'sh-blender')
  assert.match(name, /^[a-z0-9-]+$/u)
  assert.ok(description && description.length > 20, 'description too short')
  assert.ok(!description.includes('<') && !description.includes('>'), 'description contains angle brackets')
})

check('29 MODULE.md frontmatter has only name/description', () => {
  for (const file of walk(SKILL_ROOT).filter((p) => p.endsWith('MODULE.md'))) {
    const keys = frontmatterOf(file)
    assert.deepEqual(keys.sort(), ['description', 'name'], `${relative(ROOT, file)}: ${keys.join(',')}`)
  }
})

// 5. Licensing ----------------------------------------------------------------
check('three upstream copyright notices preserved', () => {
  assert.match(read(join(ROOT, 'LICENSE')), /Copyright \(c\) 2026 SH/u)
  assert.match(read(join(SKILL_ROOT, 'LICENSE')), /Copyright \(c\) 2026 CheshireJCat/u)
  assert.match(read(join(SKILL_ROOT, 'UPSTREAM_LICENSE')), /Copyright \(c\) 2026 RobLe3/u)
  const notices = read(join(ROOT, 'THIRD_PARTY_NOTICES.md'))
  assert.match(notices, /Copyright \(c\) 2026 nekos/u)
  assert.match(notices, /CheshireJCat\/blender/u)
  assert.match(notices, /RobLe3\/cc-blender-skill/u)
})

// 6. Residual host coupling ---------------------------------------------------
const ALLOW_FILES = new Set([
  'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md',
  'README.md', 'README.zh-CN.md',
  'skills/sh-blender/LICENSE', 'skills/sh-blender/UPSTREAM_LICENSE',
  'skills/sh-blender/references/upstream.md',
  'src/vendor/dsh-tools.js', 'src/vendor/schemastery.js',
  'scripts/validate-plugin.js', 'docs/VERIFICATION.md',
])
const ALLOW_LINE = /SPDX|Adapted from|Copied verbatim|From CheshireJCat|THIRD_PARTY_NOTICES|@deepseek-ai\/dsh-tools|sh-blender-modeling|namespace\.get\("dsh_result"|not inside DeepSeek Harness|dsh-tools\.js/u
const COUPLING = /\bdsh\b|cheshirejcat|@deepseek-ai\/|cordis|read_image|pnpm|DSH_|blender-modeling'/iu

check('no residual upstream host coupling in shipped sources', () => {
  const offenders = []
  for (const file of walk(ROOT)) {
    if (file.includes(`${'\\'}.git${'\\'}`) || file.includes('/.git/')) continue
    if (!/\.(md|js|mjs|py|json|yml|yaml)$/iu.test(file)) continue
    const rel = relative(ROOT, file).split('\\').join('/')
    if (ALLOW_FILES.has(rel)) continue
    const lines = read(file).split(/\r?\n/u)
    lines.forEach((line, index) => {
      if (ALLOW_LINE.test(line)) return
      if (COUPLING.test(line)) offenders.push(`${rel}:${index + 1}: ${line.trim().slice(0, 100)}`)
    })
  }
  assert.deepEqual(offenders, [], `\n${offenders.join('\n')}`)
})

// 7. Report -------------------------------------------------------------------
for (const note of notes) process.stdout.write(`${note}\n`)
if (failures.length) {
  for (const failure of failures) process.stderr.write(`${failure}\n`)
  process.stderr.write(`\nvalidation failed: ${failures.length} check(s)\n`)
  process.exit(1)
}
process.stdout.write(`\nvalidated sh-blender ${json('package.json').version}: 1 skill + 29 modules, 26 helpers, 13 tools\n`)
