// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
// CLI fallback: `bin/sh-blender` is added to the shell PATH when the plugin is
// enabled. It shares the exact same tool registry as the MCP server.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { createToolRegistry } from './tools.js'
import { createDispatcher } from './jsonrpc.js'
import { PLUGIN_ROOT, PLUGIN_DATA, WORKSPACE, VERSION } from './config.js'

const argv = process.argv.slice(2)

function usage() {
  return `sh-blender ${VERSION} — WorkBuddy Blender plugin CLI

Usage:
  sh-blender list-tools                    List the 13 tool names and schemas
  sh-blender <tool> [--json '<object>']    Run one tool with JSON arguments
  sh-blender status                        Alias for blender_status
  sh-blender setup-analysis                Create the persistent Python .venv
  sh-blender mcp-selftest                  Exercise the JSON-RPC dispatcher
  sh-blender info                          Print resolved paths

Paths:
  plugin root : ${PLUGIN_ROOT}
  plugin data : ${PLUGIN_DATA}
  workspace   : ${WORKSPACE}
`
}

function fail(message) {
  process.stderr.write(`[sh-blender] ${message}\n`)
  process.exit(1)
}

function parseArgs() {
  const index = argv.indexOf('--json')
  if (index === -1) return {}
  const raw = argv[index + 1]
  if (!raw) fail('--json requires a JSON object argument')
  try {
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) fail('--json must be an object')
    return parsed
  } catch (cause) {
    fail(`invalid --json: ${cause instanceof Error ? cause.message : String(cause)}`)
  }
}

async function main() {
  const command = argv[0]
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write(usage())
    return
  }

  if (command === 'info') {
    process.stdout.write(JSON.stringify({ version: VERSION, pluginRoot: PLUGIN_ROOT, pluginData: PLUGIN_DATA, workspace: WORKSPACE }, null, 2) + '\n')
    return
  }

  if (command === 'setup-analysis') {
    const script = join(PLUGIN_ROOT, 'scripts', 'setup-analysis.js')
    const run = spawnSync(process.execPath, [script], {
      stdio: 'inherit',
      env: { ...process.env, SH_BLENDER_ROOT: PLUGIN_ROOT, SH_BLENDER_DATA: PLUGIN_DATA },
    })
    process.exit(run.status ?? 1)
  }

  const registry = createToolRegistry()
  const dispatcher = createDispatcher(registry)

  if (command === 'list-tools') {
    process.stdout.write(JSON.stringify(registry.definitions(), null, 2) + '\n')
    return
  }

  if (command === 'mcp-selftest') {
    const versions = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25']
    const report = []
    for (const protocolVersion of versions) {
      const init = await dispatcher.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion, capabilities: {}, clientInfo: { name: 'selftest', version: '1.0.0' } } }))
      if (init?.error) fail(`initialize failed for ${protocolVersion}: ${init.error.message}`)
      if (init.result.protocolVersion !== protocolVersion) fail(`protocolVersion not echoed for ${protocolVersion}`)
      report.push({ protocolVersion, echoed: init.result.protocolVersion, server: init.result.serverInfo })
    }
    const list = await dispatcher.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }))
    if (list?.error) fail(`tools/list failed: ${list.error.message}`)
    if (list.result.tools.length !== 13) fail(`expected 13 tools, got ${list.result.tools.length}`)
    for (const tool of list.result.tools) {
      if (tool.inputSchema?.type !== 'object') fail(`tool ${tool.name} has an invalid inputSchema`)
    }
    const ping = await dispatcher.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping', params: {} }))
    const unknown = await dispatcher.handleLine(JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'not_a_tool', arguments: {} } }))
    const notification = await dispatcher.handleLine(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }))
    const badJson = await dispatcher.handleLine('{not json')
    process.stdout.write(JSON.stringify({
      ok: true,
      protocolVersions: report,
      toolCount: list.result.tools.length,
      ping: ping.result,
      unknownToolCode: unknown.error?.code,
      notificationReturnsNull: notification === null,
      parseErrorCode: badJson.error?.code,
    }, null, 2) + '\n')
    return
  }

  const toolName = command === 'status' ? 'blender_status' : command
  if (!registry.names.includes(toolName)) fail(`unknown tool: ${toolName}\nRun "sh-blender list-tools" to see available tools.`)
  const value = await registry.call(toolName, parseArgs())
  process.stdout.write(JSON.stringify(value, null, 2) + '\n')
}

main().catch((cause) => fail(cause instanceof Error ? cause.stack : String(cause)))
