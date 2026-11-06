#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
// Standalone, explicitly invoked setup stage. WorkBuddy does not run npm
// install / prepare hooks when installing a plugin, so the Python analysis
// environment is created once by `sh-blender setup-analysis`.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(process.env.SH_BLENDER_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '..'))
const DATA = resolve(process.env.SH_BLENDER_DATA || join(ROOT, '.plugin-data'))
const ENVIRONMENT = join(DATA, '.venv')
const REQUIREMENTS = join(ROOT, 'requirements-analysis.txt')

const configuredPython = (process.env.SH_BLENDER_ANALYSIS_PYTHON || '').trim()
const bootstrapPython = configuredPython || (process.platform === 'win32' ? 'python' : 'python3')
const environmentPython = process.platform === 'win32'
  ? join(ENVIRONMENT, 'Scripts', 'python.exe')
  : join(ENVIRONMENT, 'bin', 'python')

const PROBE = 'import cv2,numpy,PIL,scipy; print(f"analysis runtime ready: opencv={cv2.__version__} numpy={numpy.__version__} pillow={PIL.__version__} scipy={scipy.__version__}")'

function run(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit', windowsHide: true })
    child.once('error', rejectPromise)
    child.once('close', (code) => {
      if (code === 0) resolvePromise()
      else rejectPromise(new Error(`${command} exited with code ${code ?? 1}`))
    })
  })
}

function probe() {
  const result = spawnSync(environmentPython, ['-c', PROBE], { encoding: 'utf8', windowsHide: true })
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() }
}

mkdirSync(DATA, { recursive: true })
if (!existsSync(environmentPython)) {
  process.stdout.write(`[sh-blender] creating ${ENVIRONMENT} using ${bootstrapPython}\n`)
  // --system-site-packages reuses an already-provisioned host Python (common in
  // managed WorkBuddy installs) and avoids large downloads when OpenCV/NumPy/
  // Pillow/SciPy are already installed.
  await run(bootstrapPython, ['-m', 'venv', '--system-site-packages', ENVIRONMENT])
}

let status = probe()
if (status.ok) {
  process.stdout.write(`${status.output}\n`)
} else {
  process.stdout.write('[sh-blender] analysis dependencies missing; installing from requirements-analysis.txt\n')
  try {
    await run(environmentPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', REQUIREMENTS])
  } catch (error) {
    process.stderr.write(`[sh-blender] pip install failed: ${error.message}\n`)
  }
  status = probe()
  if (!status.ok) {
    process.stderr.write(`${status.output}\n`)
    throw new Error('analysis runtime is not ready; set the plugin option analysis_python to a Python with OpenCV, NumPy, Pillow and SciPy')
  }
  process.stdout.write(`${status.output}\n`)
}
process.stdout.write(`[sh-blender] analysis runtime ready at ${ENVIRONMENT}\n`)
