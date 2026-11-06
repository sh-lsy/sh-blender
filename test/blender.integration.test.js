// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
// Opt-in real Blender smoke test: RUN_BLENDER_TESTS=1 node --test test/blender.integration.test.js
import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const workspace = await mkdtemp(join(tmpdir(), 'sh-blender-e2e-'))
process.env.SH_BLENDER_WORKSPACE = workspace
process.env.SH_BLENDER_ROOT = process.env.SH_BLENDER_ROOT || join(process.cwd())
const { createToolRegistry } = await import('../src/tools.js')
const { loadConfig } = await import('../src/config.js')

test('real Blender 3D production pipeline', { skip: process.env.RUN_BLENDER_TESTS !== '1' && 'set RUN_BLENDER_TESTS=1' }, async (t) => {
  t.after(async () => { await rm(workspace, { recursive: true, force: true }) })
  const registry = createToolRegistry()

  const status = await registry.call('blender_status', {})
  assert.equal(status.available, true, `Blender unavailable: ${status.version}`)
  assert.equal(status.helperCount, 23)
  assert.equal(status.workspaceRoot, workspace)

  const created = await registry.call('blender_python', {
    save_path: 'cube.blend',
    script: `
import bpy
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_cube_add()
bpy.context.object.name = 'SH-Smoke-Cube'
mat = bpy.data.materials.new('Smoke-Material')
bpy.context.object.data.materials.append(mat)
bpy.ops.object.camera_add(location=(4, -4, 3))
camera = bpy.context.object
from mathutils import Vector
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = camera
sh_result = {'created': 'SH-Smoke-Cube'}
`,
  })
  assert.ok(created.bytes > 0)
  assert.deepEqual(created.scriptResult, { created: 'SH-Smoke-Cube' })

  const scene = await registry.call('blender_scene_info', { blend_path: 'cube.blend' })
  assert.ok(scene.scene.objectCount >= 1)

  const object = await registry.call('blender_object_info', { blend_path: 'cube.blend', object_names: ['SH-Smoke-Cube'] })
  assert.equal(object.objects[0].name, 'SH-Smoke-Cube')

  const preview = await registry.call('blender_preview', {
    blend_path: 'cube.blend', output_path: 'preview.png', width: 160, height: 160, samples: 4,
  })
  assert.ok(preview.bytes > 0)

  const rendered = await registry.call('blender_render', {
    blend_path: 'cube.blend', output_path: 'render.png', width: 160, height: 160, samples: 4,
  })
  assert.ok(rendered.bytes > 0)

  const exported = await registry.call('blender_export', { blend_path: 'cube.blend', output_path: 'cube.glb' })
  assert.ok(exported.bytes > 0)
  assert.equal(exported.format, 'glb')

  const reimported = await registry.call('blender_validate_export', { model_path: 'cube.glb', profile: 'web' })
  assert.equal(reimported.validation.passed, true)
  assert.ok(reimported.importedObjects.includes('SH-Smoke-Cube'))

  const catalog = await registry.call('blender_helper_catalog', {})
  assert.equal(catalog.helpers.length, 23)
  const maintenanceRegistry = createToolRegistry(loadConfig({ enableMaintenanceHelpers: true }))
  const withMaintenance = await maintenanceRegistry.call('blender_helper_catalog', { include_maintenance: true })
  assert.equal(withMaintenance.helpers.length, 26)

  await assert.rejects(
    registry.call('blender_python', { save_path: '../escape.blend', script: 'pass' }),
    /must stay inside/u,
  )
  assert.ok((await stat(join(workspace, 'cube.glb'))).size > 0)
})
