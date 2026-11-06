// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
// Zero-dependency stdio MCP server for the sh-blender WorkBuddy plugin.
//
// CRITICAL: stdout carries JSON-RPC frames only. Every diagnostic goes to
// stderr, and all child processes are spawned with piped stdio so nothing
// can interleave with the protocol stream.

import { createInterface } from 'node:readline'
import { createToolRegistry } from '../src/tools.js'
import { createDispatcher } from '../src/jsonrpc.js'
import { loadConfig, PLUGIN_ROOT, PLUGIN_DATA, WORKSPACE } from '../src/config.js'

const log = (...parts) => process.stderr.write(`[sh-blender] ${parts.join(' ')}\n`)

// Never let a stray console.log corrupt the protocol stream.
console.log = (...parts) => log('[stdout-redirect]', ...parts)
console.info = (...parts) => log('[info]', ...parts)
console.debug = (...parts) => log('[debug]', ...parts)

let registry
try {
  registry = createToolRegistry(loadConfig())
  log(`starting: root=${PLUGIN_ROOT} data=${PLUGIN_DATA} workspace=${WORKSPACE} tools=${registry.names.length}`)
} catch (cause) {
  log(`fatal: ${cause instanceof Error ? cause.stack : String(cause)}`)
  process.exit(1)
}

const dispatcher = createDispatcher(registry, {
  instructions: 'sh-blender: 13 workspace-scoped Blender tools (blender_*), 26 whitelisted helpers, and 30 bundled skill documents. Call blender_status first. Tool names may be namespaced by the host; use the blender_* suffix.',
})

/** The single and only writer to stdout. */
function writeFrame(frame) {
  if (frame === null) return
  process.stdout.write(`${JSON.stringify(frame)}\n`)
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false })

rl.on('line', (line) => {
  if (line.trim() === '') return
  // Dispatch sequentially per line but never block the readline loop: each
  // request gets its own AbortController inside the dispatcher.
  dispatcher.handleLine(line)
    .then(writeFrame)
    .catch((cause) => {
      log(`dispatch error: ${cause instanceof Error ? cause.stack : String(cause)}`)
      writeFrame({ jsonrpc: '2.0', id: null, error: { code: -32603, message: String(cause) } })
    })
})

rl.once('close', () => {
  log('stdin closed, shutting down')
  process.exit(0)
})

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
process.on('uncaughtException', (cause) => log(`uncaught: ${cause?.stack ?? String(cause)}`))
process.on('unhandledRejection', (cause) => log(`unhandled rejection: ${String(cause)}`))
