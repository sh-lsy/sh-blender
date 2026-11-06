// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC_DIR = dirname(fileURLToPath(import.meta.url))

/** Read-only plugin installation directory. Never write here at runtime. */
export const PLUGIN_ROOT = resolve(process.env.SH_BLENDER_ROOT || resolve(SRC_DIR, '..'))

/** Persistent plugin-internal state (temporary payloads, .venv). */
export const PLUGIN_DATA = resolve(process.env.SH_BLENDER_DATA || join(PLUGIN_ROOT, '.plugin-data'))

/** Current task workspace: all user-visible artifacts must stay inside it. */
export const WORKSPACE = resolve(process.env.SH_BLENDER_WORKSPACE || process.cwd())

export const VERSION = '1.0.0'

export const DEFAULTS = Object.freeze({
  blenderExecutable: 'blender',
  analysisPythonExecutable: '',
  timeoutMs: 180000,
  helperTimeoutMs: 120000,
  maxOutputChars: 20000,
  restrictToWorkspace: true,
  enablePython: true,
  enableHelpers: true,
  enableMaintenanceHelpers: false,
  registerSkill: true,
  registerModuleSkills: true,
})

function firstNonEmpty(...values) {
  return values.find((v) => typeof v === 'string' && v.trim() !== '') ?? ''
}

function detectBlender() {
  if (process.platform !== 'win32') return 'blender'
  // On Windows the WorkBuddy desktop process does not always inherit the
  // shell PATH. Probe common installation roots before falling back.
  const candidates = [
    'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
  ]
  return candidates.find((p) => existsSync(p)) ?? 'blender'
}

export function loadConfig(overrides = {}) {
  const executable = firstNonEmpty(
    process.env.SH_BLENDER_EXECUTABLE,
    process.env.CODEBUDDY_PLUGIN_OPTION_BLENDER_EXECUTABLE,
    process.env.CLAUDE_PLUGIN_OPTION_BLENDER_EXECUTABLE,
  )
  const analysisPython = firstNonEmpty(
    process.env.SH_BLENDER_ANALYSIS_PYTHON,
    process.env.CODEBUDDY_PLUGIN_OPTION_ANALYSIS_PYTHON,
    process.env.CLAUDE_PLUGIN_OPTION_ANALYSIS_PYTHON,
  )
  const config = {
    ...DEFAULTS,
    blenderExecutable: executable || detectBlender(),
    analysisPythonExecutable: analysisPython,
    ...overrides,
  }

  if (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0) throw new Error('timeoutMs must be a positive finite number')
  if (!Number.isFinite(config.helperTimeoutMs) || config.helperTimeoutMs <= 0) throw new Error('helperTimeoutMs must be a positive finite number')
  if (!Number.isInteger(config.maxOutputChars) || config.maxOutputChars < 1000) throw new Error('maxOutputChars must be an integer >= 1000')
  if (typeof config.blenderExecutable !== 'string' || config.blenderExecutable.trim() === '') throw new Error('blenderExecutable must not be empty')
  if (typeof config.analysisPythonExecutable !== 'string') throw new Error('analysisPythonExecutable must be a string')
  return config
}

/**
 * Build the synthetic host-style exec object expected by the borrowed runtime.
 * `sessionWorkspace()` reads exec.agent.session.header.cwd, so injecting the
 * WorkBuddy task workspace here keeps all upstream path guards intact.
 */
export function makeExec(signal) {
  return {
    signal: signal ?? new AbortController().signal,
    agent: { session: { header: { cwd: WORKSPACE } } },
  }
}
