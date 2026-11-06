// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
import assert from 'node:assert/strict'
import test from 'node:test'
import { createDispatcher, ERROR_CODES } from '../src/jsonrpc.js'
import { createToolRegistry } from '../src/tools.js'

const fakeRegistry = {
  names: ['ok_tool', 'bad_tool'],
  definitions: () => [{ name: 'ok_tool', description: 'ok', inputSchema: { type: 'object', properties: {} } }],
  async call(name, args, signal) {
    if (name === 'bad_tool') throw new Error('tool exploded')
    if (name === 'slow_tool') {
      await new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason ?? new Error('aborted')), { once: true })
      })
    }
    return { name, args }
  },
}

const line = (obj) => JSON.stringify(obj)

test('initialize echoes each legacy protocol version', async () => {
  const d = createDispatcher(fakeRegistry)
  for (const version of ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25', '2026-07-28']) {
    const res = await d.handleLine(line({ jsonrpc: '2.0', id: version, method: 'initialize', params: { protocolVersion: version, capabilities: {}, clientInfo: { name: 't', version: '1' } } }))
    assert.equal(res.error, undefined)
    assert.equal(res.result.protocolVersion, version)
    assert.equal(res.result.serverInfo.name, 'sh-blender')
    assert.equal(res.result.capabilities.tools.listChanged, false)
  }
})

test('tools/list, ping, resources/list and prompts/list', async () => {
  const d = createDispatcher(fakeRegistry)
  const list = await d.handleLine(line({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }))
  assert.equal(list.result.tools.length, 1)
  assert.equal((await d.handleLine(line({ jsonrpc: '2.0', id: 2, method: 'ping' }))).result !== undefined, true)
  assert.deepEqual((await d.handleLine(line({ jsonrpc: '2.0', id: 3, method: 'resources/list' }))).result, { resources: [] })
  assert.deepEqual((await d.handleLine(line({ jsonrpc: '2.0', id: 4, method: 'prompts/list' }))).result, { prompts: [] })
})

test('tools/call returns content, and tool errors use isError', async () => {
  const d = createDispatcher(fakeRegistry)
  const ok = await d.handleLine(line({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ok_tool', arguments: { a: 1 } } }))
  assert.equal(ok.result.isError, undefined)
  assert.deepEqual(JSON.parse(ok.result.content[0].text), { name: 'ok_tool', args: { a: 1 } })
  const bad = await d.handleLine(line({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'bad_tool', arguments: {} } }))
  assert.equal(bad.result.isError, true)
  assert.match(bad.result.content[0].text, /tool exploded/u)
})

test('error codes for unknown tool, unknown method, bad JSON and invalid request', async () => {
  const d = createDispatcher(fakeRegistry)
  assert.equal((await d.handleLine(line({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'nope' } }))).error.code, ERROR_CODES.INVALID_PARAMS)
  assert.equal((await d.handleLine(line({ jsonrpc: '2.0', id: 2, method: 'nope' }))).error.code, ERROR_CODES.METHOD_NOT_FOUND)
  assert.equal((await d.handleLine('{broken')).error.code, ERROR_CODES.PARSE_ERROR)
  assert.equal((await d.handleLine(line({ jsonrpc: '1.0', id: 3, method: 'ping' }))).error.code, ERROR_CODES.INVALID_REQUEST)
})

test('notifications never receive a response', async () => {
  const d = createDispatcher(fakeRegistry)
  assert.equal(await d.handleLine(line({ jsonrpc: '2.0', method: 'notifications/initialized' })), null)
  assert.equal(await d.handleLine(line({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 99 } })), null)
  assert.equal(await d.handleLine(line({ jsonrpc: '2.0', method: 'unknown/notification' })), null)
})

test('concurrent requests are tracked independently and are cancellable', async () => {
  const slow = {
    names: ['slow_tool'],
    definitions: () => [],
    async call(_name, _args, signal) {
      await new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason ?? new Error('aborted')), { once: true })
      })
      return 'done'
    },
  }
  const d = createDispatcher(slow)
  const pending = d.handleLine(line({ jsonrpc: '2.0', id: 'A', method: 'tools/call', params: { name: 'slow_tool', arguments: {} } }))
  assert.equal(d.pending, 1)
  assert.equal(await d.handleLine(line({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 'A' } })), null)
  const res = await pending
  assert.equal(res.result.isError, true)
  assert.match(res.result.content[0].text, /cancelled|aborted/iu)
  assert.equal(d.pending, 0)
})

test('real registry exposes 13 tools with object inputSchema', async () => {
  const d = createDispatcher(createToolRegistry())
  const res = await d.handleLine(line({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }))
  assert.equal(res.result.tools.length, 13)
  for (const tool of res.result.tools) assert.equal(tool.inputSchema.type, 'object')
})
