// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
// Opt-in helper integration: RUN_HELPER_TESTS=1 node --test test/helpers.integration.test.js
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const workspace = await mkdtemp(join(tmpdir(), 'sh-blender-helpers-'))
process.env.SH_BLENDER_WORKSPACE = workspace
const { createToolRegistry } = await import('../src/tools.js')
const { loadConfig } = await import('../src/config.js')
const { HELPER_CATALOG } = await import('../src/helper-catalog.js')

test('helper catalog exposes 23 by default and 26 with maintenance enabled', {
  skip: process.env.RUN_HELPER_TESTS !== '1' && 'set RUN_HELPER_TESTS=1',
}, async (t) => {
  t.after(async () => { await rm(workspace, { recursive: true, force: true }) })
  const registry = createToolRegistry()
  const analysis = await registry.call('blender_helper_catalog', {})
  assert.equal(analysis.helpers.length, 23)
  const maintenanceRegistry = createToolRegistry(loadConfig({ enableMaintenanceHelpers: true }))
  const all = await maintenanceRegistry.call('blender_helper_catalog', { include_maintenance: true })
  assert.equal(all.helpers.length, 26)
  assert.equal(HELPER_CATALOG.filter((h) => h.maintenance).length, 3)

  // A maintenance helper is blocked unless explicitly enabled.
  await assert.rejects(
    registry.call('blender_helper_run', { helper: 'skill-graph-audit', arguments: {} }),
    /maintenance|disabled|blocked/iu,
  )

  // 64x64 PGM with a white square outline, matching the upstream smoke fixture.
  const pixels = Buffer.alloc(64 * 64, 255)
  for (let y = 12; y <= 51; y += 1) {
    for (let x = 12; x <= 51; x += 1) {
      if (x < 16 || x > 47 || y < 16 || y > 47) pixels[y * 64 + x] = 0
    }
  }
  await writeFile(join(workspace, 'square.pgm'), Buffer.concat([Buffer.from('P5\n64 64 255\n'), pixels]))

  const result = await registry.call('blender_helper_run', {
    helper: 'wireframe-analyzer',
    arguments: { image: 'square.pgm', out: 'wireframe.json' },
  })
  assert.equal(result.helper, 'wireframe-analyzer')
  assert.ok(result.report.metadata.num_contours >= 1)
  assert.ok(result.outputs.some((o) => o.path.endsWith('wireframe.json')))
})
