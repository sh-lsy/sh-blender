// SPDX-License-Identifier: MIT
// Minimal local stand-in for `@deepseek-ai/schemastery`.
//
// The borrowed upstream runtime only uses this to declare its `Config` schema.
// sh-blender owns configuration in src/config.js, so this shim exists purely
// to keep the vendored module importable without the DeepSeek Harness runtime.
class Schema {
  constructor(type) {
    this.type = type
    this.defaultValue = undefined
  }

  static string() { return new Schema('string') }
  static number() { return new Schema('number') }
  static boolean() { return new Schema('boolean') }

  static object(shape) {
    const defaults = {}
    for (const [key, value] of Object.entries(shape)) {
      if (value instanceof Schema) defaults[key] = value.defaultValue
    }
    return { type: 'object', shape, defaults }
  }

  default(value) {
    this.defaultValue = value
    return this
  }
}

export default Schema
