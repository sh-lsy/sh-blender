# Changelog

All notable changes to `sh-blender` are documented here. This project starts
at `1.0.0`; it is **not** a continuation of the upstream `dsh-blender` version
line.

## 1.0.6 - 2026-11-06

Silhouette helpers no longer report a false perfect match on opaque renders.
Found while auditing the pagoda: `silhouette-validator` returned
`iou: 1.0, mse: 0.0` for two visibly different images.

- Cause: both mask-based helpers prefer the alpha channel whenever an image has
  four channels, but renders saved without transparent film are fully opaque, so
  the mask covered the whole frame and every pair "matched" perfectly.
- `silhouette_validator.py` now falls back to a luminance threshold when the
  alpha channel is flat, reports `mask_mode` (`alpha` / `luma_fallback`) and adds
  a warning when a mask covers more than 98 % of the frame. Verified: the same
  opaque pair now reports IoU 0.084 with the warning, while transparent renders
  keep the alpha path (IoU 1.0, correct bbox `[202, 82, 236, 476]`).
- `reference_manifest_compiler.py` applies the same fallback and records
  `alpha_degenerate`, so an opaque reference is measured by Otsu instead of being
  reported as one full-frame component.

## 1.0.5 - 2026-11-06

Two defects found by auditing a real user asset (a 7-tier pagoda) with the full
tool surface.

- **FBX export/import was broken.** The driver called
  `bpy.ops.wm.fbx_export` / `bpy.ops.wm.fbx_import`, which do not exist in
  Blender 5.x, and the `hasattr(bpy.ops.wm, ...)` guard never fell through
  because `bpy.ops` resolves attributes lazily. Both paths now use the add-on
  operators `bpy.ops.export_scene.fbx` / `bpy.ops.import_scene.fbx` and enable
  `io_scene_fbx` when it is not already active. Verified: 519 420 B FBX export,
  re-import of all 15 objects.
- **Import polluted the scene.** `blender_import` and `blender_validate_export`
  imported the asset on top of Blender's startup scene, so the saved `.blend`
  and every validation report carried a stray `Cube`, `Camera`, `Light` and
  `Material` — contradicting the documented "clean scene". Import now starts
  from `read_factory_settings(use_empty=True)`; `blender_validate_export` on the
  exported OBJ reports exactly 12 objects and no `Cube`.
- Verified in the same audit: scene/object inspection, preview, still render,
  frame sequence, GLB/OBJ/STL/PLY/USD export, GLB round-trip validation,
  3d-print profile failing correctly on non-manifold geometry,
  `surface-texture-coverage-audit`, `animation-contact-sheet`, plus the guard
  rails (overwrite denial, traversal rejection, unknown/maintenance helper).

## 1.0.4 - 2026-11-06

Skill rename, marketplace snapshot hygiene, and the installed-side analysis
runtime.

- **Renamed the skill** `create-3d-model` → `sh-blender`: the directory is now
  `skills/sh-blender/`, the frontmatter `name` is `sh-blender`, and the slash
  command is `/sh-blender:sh-blender`. Previously `/sh` could not match the
  entry, which is why the command felt "missing" from the menu. Orchestrator
  prose in the module references was updated accordingly; the upstream
  provenance documents still refer to the original `create-3d-model` name,
  because that is what the adaptation came from.
- `src/upstream-runtime.js`, `scripts/validate-plugin.js` and
  `scripts/desktop-plugin.mjs` now resolve `skills/sh-blender/...`; the
  validator asserts the new name.
- `scripts/sync-local-marketplace.mjs` no longer ships workspace-local agent
  state: `.workbuddy/` is filtered out of the file list and directories left
  empty by pruning are removed, so both the snapshot and the installed cache
  carry only plugin files.
- Installed-side fix: when the plugin is loaded from the desktop cache,
  `${CODEBUDDY_PLUGIN_DATA}` is the host data directory
  (`~/.workbuddy/plugins/data/sh-blender-sh-lsy-plugins`), **not** the project's
  `.plugin-data`. The analysis runtime must be created there with
  `SH_BLENDER_DATA=<host data dir> node scripts/setup-analysis.js`, otherwise
  `blender_status.analysis.available` stays `false` and every Python helper is
  unavailable even though the project-side venv exists.
- Local cache cleanup: superseded `1.0.0` / `1.0.1` caches and the duplicated
  `*.bak-sh-blender-<date>` backups were moved aside, and `.in_use` markers whose
  pid no longer exists were removed.

## 1.0.3 - 2026-11-06

Fixed desktop MCP loading and version reporting.

- **Root cause**: the desktop's `PluginMcpProvider` throws
  `MissingPluginUserConfigError` for an unset `${user_config.KEY}` and skips the
  entire MCP server; `${CODEBUDDY_PROJECT_DIR}` is never substituted. Both were
  present in `.mcp.json`, so the plugin's 13 tools never appeared.
- `.mcp.json` now uses only `${CODEBUDDY_PLUGIN_ROOT}` /
  `${CODEBUDDY_PLUGIN_DATA}`. Optional values come from host-injected
  `CODEBUDDY_PLUGIN_OPTION_*` variables; `userConfig` keys have `default: ""`.
- `src/config.js` rejects unresolved `${...}` placeholders and resolves the
  workspace from `CODEBUDDY_PROJECT_DIR` / `process.cwd()`.
- `src/jsonrpc.js` and `src/config.js` now report the real package version
  instead of a hard-coded `1.0.0`.
- `scripts/desktop-plugin.mjs` guards against the forbidden placeholders and
  documents the correct skill name (`create-3d-model`, not `sh-blender`).
- **Desktop verification**: after the fix the host's own catalog scan reported
  `servers=4 -> 5` with no skip warning, `custom-mcp:sh-blender state=ready`,
  and all 13 `blender_*` tools in `mcp-tool-list.json`. Confirmed the desktop
  re-scans automatically about every 10 minutes, so a version bump is picked up
  without a restart (restart still makes it immediate).

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
