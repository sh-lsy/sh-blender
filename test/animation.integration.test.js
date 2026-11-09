// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
// Opt-in animation-chain test:
//   RUN_ANIMATION_TESTS=1 node --test test/animation.integration.test.js
//
// Covers the three pieces that only real animation data can exercise:
//   blender_render_frames -> animation-contact-sheet -> animation profile
// plus the glTF animation round-trip through blender_validate_export.
import assert from 'node:assert/strict'
import { basename, join } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import test from 'node:test'

const workspace = await mkdtemp(join(tmpdir(), 'sh-blender-anim-'))
process.env.SH_BLENDER_WORKSPACE = workspace
process.env.SH_BLENDER_ROOT = process.env.SH_BLENDER_ROOT || join(process.cwd())
const { createToolRegistry } = await import('../src/tools.js')

const ANIMATED_SCENE = `
import bpy, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)


def iter_fcurves(action):
    """Blender 5 removed Action.fcurves in favour of layered actions."""
    legacy = getattr(action, 'fcurves', None)
    if legacy is not None:
        yield from legacy
        return
    for layer in action.layers:
        for strip in layer.strips:
            for bag in getattr(strip, 'channelbags', []):
                yield from bag.fcurves


bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1.0, depth=2.4, location=(0, 0, 1.2))
obj = bpy.context.object
obj.name = 'SH-Spinner'
mat = bpy.data.materials.new('MAT-Spinner')
mat.use_nodes = True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.9, 0.55, 0.15, 1.0)
obj.data.materials.append(mat)

# Two channels so the test is not satisfied by a single F-curve.
for frame, angle in ((1, 0.0), (24, 180.0), (48, 360.0)):
    obj.rotation_euler = (0.0, 0.0, math.radians(angle))
    obj.keyframe_insert('rotation_euler', frame=frame, index=2)
for frame, height in ((1, 1.2), (24, 2.1), (48, 1.2)):
    obj.location = (0.0, 0.0, height)
    obj.keyframe_insert('location', frame=frame, index=2)
for fcurve in iter_fcurves(obj.animation_data.action):
    for key in fcurve.keyframe_points:
        key.interpolation = 'BEZIER'

bpy.ops.object.camera_add(location=(6.5, -6.5, 4.5))
camera = bpy.context.object
camera.name = 'CAM-Orbit'
camera.rotation_euler = (Vector((0.0, 0.0, 1.5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = camera
bpy.ops.object.light_add(type='AREA', location=(3.0, -3.0, 6.0))
bpy.context.object.data.energy = 900.0

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 48
sh_result = {
    'action': obj.animation_data.action.name,
    'fcurves': len(list(iter_fcurves(obj.animation_data.action))),
    'range': [scene.frame_start, scene.frame_end],
}
`

const STATIC_SCENE = `
import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1.0, depth=2.4, location=(0, 0, 1.2))
bpy.context.object.name = 'SH-Static'
bpy.ops.object.camera_add(location=(6.5, -6.5, 4.5))
camera = bpy.context.object
camera.rotation_euler = (Vector((0.0, 0.0, 1.5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = camera
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 48
sh_result = {'static': True}
`

test('animation chain: render_frames -> contact sheet -> animation profile', {
  skip: process.env.RUN_ANIMATION_TESTS !== '1' && 'set RUN_ANIMATION_TESTS=1',
}, async (t) => {
  t.after(async () => { await rm(workspace, { recursive: true, force: true }) })
  const registry = createToolRegistry()

  const status = await registry.call('blender_status', {})
  assert.equal(status.available, true, `Blender unavailable: ${status.version}`)

  // 1. Build a genuinely animated scene (rotation + translation F-curves).
  const built = await registry.call('blender_python', {
    script: ANIMATED_SCENE,
    save_path: 'animated.blend',
  })
  assert.equal(built.scriptResult.fcurves, 2)
  assert.equal(built.scriptResult.action, 'SH-SpinnerAction')
  assert.deepEqual(built.scriptResult.range, [1, 48])

  // 2. Object inspection must expose the action, otherwise the QA chain has
  //    nothing to gate on.
  const info = await registry.call('blender_object_info', {
    blend_path: 'animated.blend', object_names: ['SH-Spinner'],
  })
  assert.equal(info.objects[0].animation.action, 'SH-SpinnerAction')

  // 3. Animation profile accepts an animated scene.
  const animCheck = await registry.call('blender_validate_scene', {
    blend_path: 'animated.blend', profile: 'animation',
  })
  assert.equal(animCheck.passed, true, `animation profile rejected an animated scene: ${JSON.stringify(animCheck.errors)}`)

  // 4. Render a representative frame sequence.
  const frames = [1, 12, 24, 36, 48]
  const rendered = await registry.call('blender_render_frames', {
    blend_path: 'animated.blend',
    output_dir: 'frames',
    frames,
    width: 200,
    height: 200,
    samples: 8,
  })
  assert.deepEqual(rendered.frames, frames)
  assert.equal(rendered.imagePaths.length, frames.length)
  assert.ok(rendered.bytes > 0)
  for (const path of rendered.imagePaths) {
    assert.match(basename(path), /^frame-\d{6}\.png$/u)
  }
  // Frames must actually differ, otherwise the sequence is not animating.
  const { createHash } = await import('node:crypto')
  const { readFile } = await import('node:fs/promises')
  const digests = new Set()
  for (const path of rendered.imagePaths) {
    digests.add(createHash('sha1').update(await readFile(path)).digest('hex'))
  }
  assert.equal(digests.size, frames.length, 'rendered frames are identical; the animation did not advance')

  // 5. Contact sheet + frame-difference report.
  const sheet = await registry.call('blender_helper_run', {
    helper: 'animation-contact-sheet',
    arguments: {
      frames: rendered.imagePaths.map((path) => `frames/${basename(path)}`),
      out_image: 'frames/contact-sheet.png',
      out_report: 'frames/contact-sheet.json',
      cols: 5,
    },
  })
  assert.ok(sheet.report.frames.length === frames.length)
  const sheetImage = sheet.outputs.find((entry) => entry.path.endsWith('contact-sheet.png'))
  assert.ok(sheetImage && sheetImage.bytes > 0)

  // 6. glTF must carry the animation, and the re-import validator must see it.
  const exported = await registry.call('blender_export', {
    blend_path: 'animated.blend', output_path: 'animated.glb',
  })
  assert.ok(exported.bytes > 0)

  const roundTrip = await registry.call('blender_validate_export', {
    model_path: 'animated.glb', profile: 'animation',
  })
  assert.equal(roundTrip.validation.passed, true, `exported animation was rejected: ${JSON.stringify(roundTrip.validation.errors)}`)
  const codes = roundTrip.validation.errors.map((entry) => entry.code)
  assert.ok(!codes.includes('no-object-animation'), 'glTF round-trip lost the animation')

  // 7. Negative control: the same profile must fail on a static scene, so a
  //    green result above cannot come from an always-passing gate.
  await registry.call('blender_python', { script: STATIC_SCENE, save_path: 'static.blend' })
  const staticCheck = await registry.call('blender_validate_scene', {
    blend_path: 'static.blend', profile: 'animation',
  })
  assert.equal(staticCheck.passed, false)
  assert.deepEqual(staticCheck.errors.map((entry) => entry.code), ['no-object-animation'])
})
