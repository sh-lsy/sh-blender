// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC_DIR = dirname(fileURLToPath(import.meta.url))

/**
 * The desktop host only substitutes ${CODEBUDDY_PLUGIN_ROOT} and
 * ${CODEBUDDY_PLUGIN_DATA} in a plugin's .mcp.json. Any other placeholder is
 * passed through verbatim, so treat it as unset instead of resolving it into a
 * bogus path.
 */
function envPath(value) {
  return typeof value === 'string' && value.trim() !== '' && !value.includes('${') ? resolve(value) : ''
}

/** Read-only plugin installation directory. Never write here at runtime. */
export const PLUGIN_ROOT = envPath(process.env.SH_BLENDER_ROOT) || resolve(SRC_DIR, '..')

/** Persistent plugin-internal state (temporary payloads, .venv). */
export const PLUGIN_DATA = envPath(process.env.SH_BLENDER_DATA) || join(PLUGIN_ROOT, '.plugin-data')

/**
 * Current task workspace: all user-visible artifacts must stay inside it.
 * The desktop host injects CODEBUDDY_PROJECT_DIR into MCP subprocesses; when
 * running standalone (CLI/tests) fall back to the process cwd.
 */
export const WORKSPACE = envPath(process.env.SH_BLENDER_WORKSPACE)
  || envPath(process.env.CODEBUDDY_PROJECT_DIR)
  || envPath(process.env.CLAUDE_PROJECT_DIR)
  || resolve(process.cwd())

function readVersion() {
  try {
    const manifest = join(SRC_DIR, '..', 'package.json')
    return existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')).version : '1.0.0'
  } catch {
    return '1.0.0'
  }
}

export const VERSION = readVersion()

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
  // Unresolved ${...} placeholders must not be treated as real values.
  return values.find((v) => typeof v === 'string' && v.trim() !== '' && !v.includes('${')) ?? ''
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
