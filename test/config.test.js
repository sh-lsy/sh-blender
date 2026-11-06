// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { DEFAULTS, loadConfig, makeExec } from '../src/config.js'

test('defaults match the documented 11 configuration keys', () => {
  assert.equal(Object.keys(DEFAULTS).length, 11)
  assert.equal(DEFAULTS.timeoutMs, 180000)
  assert.equal(DEFAULTS.helperTimeoutMs, 120000)
  assert.equal(DEFAULTS.maxOutputChars, 20000)
  assert.equal(DEFAULTS.restrictToWorkspace, true)
  assert.equal(DEFAULTS.enableHelpers, true)
  assert.equal(DEFAULTS.enableMaintenanceHelpers, false)
})

test('loadConfig reads SH_BLENDER_* and userConfig environment variables', () => {
  const previous = { ...process.env }
  try {
    process.env.SH_BLENDER_EXECUTABLE = 'D:/blender/blender.exe'
    process.env.CODEBUDDY_PLUGIN_OPTION_ANALYSIS_PYTHON = 'D:/venv/python.exe'
    const config = loadConfig()
    assert.equal(config.blenderExecutable, 'D:/blender/blender.exe')
    assert.equal(config.analysisPythonExecutable, 'D:/venv/python.exe')
  } finally {
    process.env = previous
  }
})

test('empty userConfig values fall back to defaults instead of blank strings', () => {
  const previous = { ...process.env }
  try {
    process.env.SH_BLENDER_EXECUTABLE = '   '
    process.env.SH_BLENDER_ANALYSIS_PYTHON = ''
    delete process.env.CODEBUDDY_PLUGIN_OPTION_BLENDER_EXECUTABLE
    delete process.env.CLAUDE_PLUGIN_OPTION_BLENDER_EXECUTABLE
    delete process.env.CODEBUDDY_PLUGIN_OPTION_ANALYSIS_PYTHON
    delete process.env.CLAUDE_PLUGIN_OPTION_ANALYSIS_PYTHON
    const config = loadConfig()
    assert.equal(config.blenderExecutable, 'blender')
    assert.equal(config.analysisPythonExecutable, '')
  } finally {
    process.env = previous
  }
})

test('invalid configuration is rejected', () => {
  assert.throws(() => loadConfig({ timeoutMs: 0 }), /timeoutMs/u)
  assert.throws(() => loadConfig({ maxOutputChars: 10 }), /maxOutputChars/u)
  assert.throws(() => loadConfig({ blenderExecutable: '' }), /blenderExecutable/u)
})

test('makeExec injects the task workspace into the borrowed runtime shape', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'sh-blender-config-'))
  const previous = process.env.SH_BLENDER_WORKSPACE
  process.env.SH_BLENDER_WORKSPACE = workspace
  try {
    // WORKSPACE is resolved at module load, so re-import with a cache buster.
    const { makeExec: freshMakeExec } = await import(`../src/config.js?workspace=${encodeURIComponent(workspace)}`)
    const exec = freshMakeExec()
    assert.equal(exec.agent.session.header.cwd, workspace)
    assert.equal(typeof exec.signal.addEventListener, 'function')
  } finally {
    if (previous === undefined) delete process.env.SH_BLENDER_WORKSPACE
    else process.env.SH_BLENDER_WORKSPACE = previous
  }
  // The statically imported copy still reflects the original workspace.
  assert.equal(typeof makeExec().signal.addEventListener, 'function')
})
