// SPDX-License-Identifier: MIT
// Copyright (c) 2026 sh-lsy
import { internals } from './upstream-runtime.js'
import { HELPER_CATALOG } from './helper-catalog.js'
import { loadConfig, makeExec } from './config.js'

/** Convert an upstream `parameters` map into a valid MCP JSON Schema object. */
function toInputSchema(parameters) {
  const properties = {}
  const required = []
  for (const [name, raw] of Object.entries(parameters ?? {})) {
    const { required: isRequired, type, ...rest } = raw
    const normalizedType = type === 'json' ? 'object' : type
    properties[name] = {
      type: normalizedType,
      ...(type === 'json' ? { additionalProperties: true } : {}),
      ...rest,
    }
    if (isRequired) required.push(name)
  }
  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  }
}

/** The 13 tool descriptors, translated for MCP. */
export function listToolDefinitions(config = loadConfig()) {
  return internals.createTools(config).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toInputSchema(tool.parameters),
  }))
}

/** Executable tool registry used by both the MCP server and the CLI. */
export function createToolRegistry(config = loadConfig()) {
  const tools = new Map()
  for (const tool of internals.createTools(config)) {
    tools.set(tool.name, tool)
  }
  return {
    config,
    names: [...tools.keys()],
    definitions: () => listToolDefinitions(config),
    async call(name, args = {}, signal) {
      const tool = tools.get(name)
      if (!tool) throw new Error(`Unknown tool: ${name}`)
      const value = await tool.execute(args ?? {}, makeExec(signal))
      return value
    },
  }
}

export { HELPER_CATALOG }
