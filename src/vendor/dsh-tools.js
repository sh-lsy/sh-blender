// SPDX-License-Identifier: MIT
// Local stand-in for `@deepseek-ai/dsh-tools`'s `defineTool`.
//
// The borrowed upstream runtime (src/upstream-runtime.js) uses defineTool only
// to build a plain tool descriptor. WorkBuddy does not load the DeepSeek
// Harness runtime, so we keep the descriptor as-is and translate it into an
// MCP tool definition in src/tools.js. Keeping this shim lets us reuse the
// upstream logic verbatim while shipping zero third-party dependencies.
export function defineTool(spec) {
  return spec
}
