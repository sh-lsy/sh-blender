// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
// Bare stdio handshake: proves stdout carries nothing but JSON-RPC frames.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SERVER = join(ROOT, 'mcp', 'server.mjs')

function runServer(messages) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [SERVER], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, SH_BLENDER_ROOT: ROOT, SH_BLENDER_DATA: join(ROOT, '.plugin-data'), SH_BLENDER_WORKSPACE: ROOT },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', rejectPromise)
    child.once('close', (code) => resolvePromise({ code, stdout, stderr }))
    child.stdin.write(messages.map((m) => JSON.stringify(m)).join('\n') + '\n')
    child.stdin.end()
  })
}

test('MCP stdio handshake: frames valid, stdout pure, diagnostics on stderr', async () => {
  const { code, stdout, stderr } = await runServer([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    { jsonrpc: '2.0', id: 3, method: 'ping', params: {} },
    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'no_such_tool', arguments: {} } },
  ])
  assert.equal(code, 0)
  assert.match(stderr, /\[sh-blender\] starting:/u, 'startup diagnostics must go to stderr')

  const lines = stdout.trim().split(/\r?\n/u).filter(Boolean)
  assert.equal(lines.length, 4, `expected 4 responses, got ${lines.length}: ${stdout}`)
  const frames = lines.map((l) => JSON.parse(l)) // every line must be valid JSON
  assert.equal(frames[0].result.protocolVersion, '2025-06-18')
  assert.equal(frames[0].result.serverInfo.name, 'sh-blender')
  assert.equal(frames[1].result.tools.length, 13)
  assert.deepEqual(frames[2].result, {})
  assert.equal(frames[3].error.code, -32602)
})
