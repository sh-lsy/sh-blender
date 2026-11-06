# Changelog

All notable changes to `sh-blender` are documented here. This project starts
at `1.0.0`; it is **not** a continuation of the upstream `dsh-blender` version
line.

## 1.0.2 - 2026-11-06

Desktop installation and update workflow.

- Corrected the documented desktop UI path: the sidebar is
  **专家 · 技能 · 连接器 → 技能** (SkillHub skill market); a native plugin does
  not appear as a card there and there is no "Plugins → Marketplaces" tab.
- Added `scripts/desktop-plugin.mjs` — one command that registers the plugin
  directly as installed + enabled by writing `known_marketplaces.json`,
  `installed_plugins.json`, `settings.json → enabledPlugins`, and a versioned
  cache directory. Supports `--status` and `--bump patch|minor|major`.
- Updated `scripts/sync-local-marketplace.mjs` to include untracked-but-not-ignored
  files, so unstaged edits reach the marketplace snapshot.
- Rewrote both READMEs' installation and update sections; updated
  `docs/VERIFICATION.md` with the real desktop mechanism and the correction.
- Verified end to end with a real `--bump patch` run: versions advanced
  together, a new `1.0.2` cache was created, and `installed_plugins.json` now
  points at it.

## 1.0.0 - 2026-11-06

Initial WorkBuddy-native release maintained by `sh-lsy`.

- Built the WorkBuddy plugin skeleton: `.codebuddy-plugin/plugin.json`,
  `.mcp.json`, `.codebuddy-plugin/marketplace.json`, `package.json`, `bin/`.
- Added a zero-dependency Node stdio MCP server (`mcp/server.mjs` +
  `src/jsonrpc.js`) implementing the legacy `initialize` handshake, version
  echoing, `tools/list`, `tools/call`, `ping`, cancellation, and stdout
  isolation. All diagnostics go to stderr; child processes use piped stdio.
- Added `src/config.js`, `src/tools.js`, `src/cli.js` and local shims for the
  two upstream DeepSeek Harness imports, so the borrowed runtime stays
  importable without any third-party Node package.
- Adapted the upstream `index.js` runtime: renamed drivers, plugin-data
  temporary paths, persistent `.venv` location, task-workspace injection, and
  host-neutral wording. All 13 tool definitions and path guards retained.
- Bundled all 30 skill documents (1 auto-triggered `SKILL.md` + 29
  `MODULE.md` module documents), 26 helper scripts, 26 catalog entries and the
  domain references from `CheshireJCat/blender@v0.2.4`.
- Rewrote the orchestrator skill frontmatter, added a WorkBuddy runtime mapping
  section, and replaced `references/dsh-integration.md` with a WorkBuddy
  `integration.md`. Removed legacy `allowed-tools` / `when_to_use` frontmatter
  keys and `/tmp/` output paths from module recipes.
- Added `scripts/validate-plugin.js` (structure, metadata, licensing, residual
  coupling gate), `scripts/setup-analysis.js`, and `sh-blender mcp-selftest`.
- Added `NOTICE` and `THIRD_PARTY_NOTICES.md` with the three upstream MIT
  license texts reproduced in full. Original copyright notices are retained
  unmodified.
- Added bilingual README, security notes, and local verification records.

### Provenance

Adapted from `dsh-blender` v0.2.4 (MIT, Copyright (c) 2026 nekos), which
bundles an adapted `create-3d-model` skill (MIT, Copyright (c) 2026
CheshireJCat) derived from `RobLe3/cc-blender-skill` 1.3.0 (MIT, Copyright
(c) 2026 RobLe3). Full texts: `THIRD_PARTY_NOTICES.md`.

Upstream `dsh` plugin metadata, `cordis.patch.yml`, DSH Profile smoke tests and
the upstream author-run v0.2.3 compatibility report were **not** carried over.
All compatibility evidence in `docs/VERIFICATION.md` was produced locally for
this plugin.
