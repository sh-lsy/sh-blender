// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
// Minimal JSON-RPC 2.0 dispatcher for the MCP stdio transport.
// Deliberately dependency-free: WorkBuddy installs plugins by copying files,
// so there is no npm install step available at plugin activation time.

const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602
const INTERNAL_ERROR = -32603

const SERVER_INFO = { name: 'sh-blender', version: '1.0.0' }

function error(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

function result(id, value) {
  return { jsonrpc: '2.0', id, result: value }
}

function text(value) {
  return { type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }
}

/**
 * @param {object} registry - from createToolRegistry()
 * @param {object} [options] - { instructions }
 */
export function createDispatcher(registry, options = {}) {
  const inFlight = new Map()

  async function dispatch(message) {
    if (message === null || typeof message !== 'object' || Array.isArray(message)) {
      return error(null, INVALID_REQUEST, 'Invalid JSON-RPC request')
    }
    if (message.jsonrpc !== '2.0') {
      return error(message.id ?? null, INVALID_REQUEST, 'jsonrpc must be "2.0"')
    }

    const method = message.method
    const id = message.id
    const isNotification = !Object.hasOwn(message, 'id') || id === null || id === undefined
    const params = message.params && typeof message.params === 'object' ? message.params : {}

    // Notifications never receive a response.
    if (isNotification) {
      if (method === 'notifications/cancelled' || method === 'notifications/cancel') {
        const requestId = params.requestId ?? params.request_id
        const controller = inFlight.get(requestId)
        if (controller) {
          controller.abort(new Error('Request cancelled'))
          inFlight.delete(requestId)
        }
      }
      // notifications/initialized and unknown notifications are ignored.
      return null
    }

    if (typeof method !== 'string') return error(id, INVALID_REQUEST, 'method is required')

    switch (method) {
      case 'initialize': {
        // WorkBuddy's embedded runtime negotiates the legacy MCP protocol
        // series. Echo the client's requested version; do not force a newer one.
        const protocolVersion = typeof params.protocolVersion === 'string' && params.protocolVersion !== ''
          ? params.protocolVersion
          : '2025-06-18'
        return result(id, {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          ...(options.instructions ? { instructions: options.instructions } : {}),
        })
      }
      case 'ping':
        return result(id, {})
      case 'tools/list':
        return result(id, { tools: registry.definitions() })
      case 'resources/list':
        return result(id, { resources: [] })
      case 'prompts/list':
        return result(id, { prompts: [] })
      case 'tools/call': {
        const name = params.name
        if (typeof name !== 'string' || !registry.names.includes(name)) {
          return error(id, INVALID_PARAMS, `Unknown tool: ${String(name)}`)
        }
        const args = params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments)
          ? params.arguments
          : {}
        const controller = new AbortController()
        inFlight.set(id, controller)
        try {
          const value = await registry.call(name, args, controller.signal)
          return result(id, { content: [text(value)] })
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause)
          // Tool-level failures are reported as tool results so the model can
          // read the diagnostic and retry, following MCP convention.
          return result(id, { content: [text(message)], isError: true })
        } finally {
          inFlight.delete(id)
        }
      }
      default:
        return error(id, METHOD_NOT_FOUND, `Method not found: ${method}`)
    }
  }

  return {
    dispatch,
    /** Parse one JSON line and dispatch it. Returns a response or null. */
    async handleLine(line) {
      let message
      try {
        message = JSON.parse(line)
      } catch {
        return error(null, PARSE_ERROR, 'Parse error: invalid JSON')
      }
      try {
        return await dispatch(message)
      } catch (cause) {
        const id = message && typeof message === 'object' && !Array.isArray(message) ? message.id : null
        return error(id, INTERNAL_ERROR, cause instanceof Error ? cause.message : String(cause))
      }
    },
    get pending() { return inFlight.size },
  }
}

export const ERROR_CODES = { PARSE_ERROR, INVALID_REQUEST, METHOD_NOT_FOUND, INVALID_PARAMS, INTERNAL_ERROR }
