// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, realpath, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { DEFAULTS } from '../src/config.js'
import { internals } from '../src/upstream-runtime.js'

const config = { ...DEFAULTS, blenderExecutable: 'blender', analysisPythonExecutable: '' }
const execFor = (cwd) => ({ signal: new AbortController().signal, agent: { session: { header: { cwd } } } })

test('isWithin handles root equality and nested paths', () => {
  assert.equal(internals.isWithin('/a/b', '/a/b'), true)
  assert.equal(internals.isWithin('/a/b', '/a/b/c'), true)
  assert.equal(internals.isWithin('/a/b', '/a/bc'), false)
  assert.equal(internals.isWithin('/a/b', '/a'), false)
})

test('relative workspace paths resolve inside the task workspace', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'sh-blender-path-'))
  const resolved = await internals.resolveWorkspacePath('artifacts/model.blend', execFor(workspace), config, { kind: 'save_path' })
  assert.equal(resolved, join(workspace, 'artifacts', 'model.blend'))
})

test('parent traversal is rejected', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'sh-blender-traversal-'))
  await assert.rejects(
    internals.resolveWorkspacePath('../escape.blend', execFor(workspace), config, { kind: 'save_path' }),
    /must stay inside/u,
  )
})

test('absolute paths outside the workspace are rejected', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'sh-blender-absolute-'))
  const outside = await mkdtemp(join(tmpdir(), 'sh-blender-outside-'))
  await assert.rejects(
    internals.resolveWorkspacePath(join(outside, 'model.blend'), execFor(workspace), config, { kind: 'save_path' }),
    /must stay inside/u,
  )
})

test('symlinked output parent that escapes is rejected', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'sh-blender-link-workspace-'))
  const outside = await mkdtemp(join(tmpdir(), 'sh-blender-link-outside-'))
  await mkdir(join(workspace, 'artifacts'))
  try {
    await symlink(await realpath(outside), join(workspace, 'artifacts', 'escape'), 'dir')
  } catch (error) {
    // Windows requires Developer Mode / admin privileges for directory symlinks.
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      t.skip(`symlink creation not permitted on this host (${error.code})`)
      return
    }
    throw error
  }
  await assert.rejects(
    internals.resolveWorkspacePath('artifacts/escape/model.blend', execFor(workspace), config, { kind: 'save_path' }),
    /resolves through a path outside/u,
  )
})

test('normalizeLosslessJson removes negative zero recursively', () => {
  const value = internals.normalizeLosslessJson({ scalar: -0, nested: [-0, { value: -0 }] })
  assert.equal(Object.is(value.scalar, -0), false)
  assert.equal(Object.is(value.nested[0], -0), false)
  assert.equal(Object.is(value.nested[1].value, -0), false)
})

test('sessionWorkspace falls back to process.cwd for an empty exec', () => {
  assert.equal(typeof internals.sessionWorkspace(undefined), 'string')
})
