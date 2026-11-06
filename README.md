# sh-blender

[简体中文](README.zh-CN.md)

A WorkBuddy-native plugin maintained by [sh-lsy](https://github.com/sh-lsy) that
gives WorkBuddy a complete Blender-backed 3D production workflow: **13
workspace-scoped tools, 30 bundled skill documents, and 26 deterministic
helpers**.

It is **not** a Blender `bpy` add-on and does not require a Blender control
port. Every operation launches a fresh Blender background process. It is also
**not** a DeepSeek Harness plugin: the runtime was adapted for WorkBuddy's
plugin system (`.codebuddy-plugin/plugin.json` + `skills/` + `.mcp.json` +
`bin/`). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the upstream
MIT provenance.

## Contents at a glance

| Item | Count | Notes |
| --- | ---: | --- |
| Tools | 13 | `blender_status` … `blender_helper_run`, exposed as typed MCP tools |
| Skill documents | 30 | 1 auto-triggered orchestrator + 29 on-demand module documents |
| Helpers | 26 | 23 enabled by default, 3 maintenance helpers opt-in |
| Runtime dependencies | 0 | Node built-ins only; no `npm install` at plugin activation |

The 29 module documents live at
`skills/create-3d-model/references/modules/<name>/MODULE.md` and are read on
demand with `@references/modules/<name>/MODULE.md`. Only one skill is
auto-triggered, which keeps the session's always-on metadata small while
retaining all 30 documents.

## Requirements

- WorkBuddy desktop (Windows / macOS / Linux)
- Node.js 22.12+ (the WorkBuddy host provides it; the plugin has no dependencies)
- Blender 4.3+ on `PATH`, or set the `blender_executable` plugin option
- Python 3.10+ with OpenCV / NumPy / Pillow / SciPy **only** for the 26 helpers;
  the 13 core tools do not need it

## Install

**Local / development**

1. Clone this repository.
2. In WorkBuddy open the **Plugins** page, click **+**, and add the marketplace
   address — either the local directory (e.g. `D:\sy\sh-blender`) or its
   `.codebuddy-plugin/marketplace.json`.
3. Install `sh-blender` from that marketplace and enable it.
4. `/reload-plugins`, then check the MCP panel shows `sh-blender` as connected.

Equivalent CLI form (where available):
`/plugin marketplace add sh-lsy/sh-blender` →
`/plugin install sh-blender@sh-lsy-plugins`.

**From GitHub**

Add `https://github.com/sh-lsy/sh-blender` as the marketplace address. The
repository carries its own `.codebuddy-plugin/marketplace.json`.

> Installing a WorkBuddy plugin only copies files into a versioned cache. There
> is no `npm install` step, which is why this plugin deliberately ships zero
> third-party Node dependencies.

## Configuration

`plugin.json` declares two non-sensitive user options:

| Option | Default | Meaning |
| --- | --- | --- |
| `blender_executable` | empty → `blender` on PATH | Absolute path to the Blender executable |
| `analysis_python` | empty → `${CODEBUDDY_PLUGIN_DATA}/.venv` | Interpreter with OpenCV/NumPy/Pillow/SciPy |

Runtime defaults (in `src/config.js`, inherited from the upstream design):

```yaml
timeoutMs: 180000
helperTimeoutMs: 120000
maxOutputChars: 20000
restrictToWorkspace: true
enablePython: true
enableHelpers: true
enableMaintenanceHelpers: false
registerSkill: true
registerModuleSkills: true
```

Three locations are kept strictly separate:

- `${CODEBUDDY_PLUGIN_ROOT}` — read-only plugin code and skill resources.
- `${CODEBUDDY_PLUGIN_DATA}` — temporary payload/result JSON and the optional
  `.venv`; persists across plugin updates.
- `${CODEBUDDY_PROJECT_DIR}` — the current task workspace; **all user-visible
  artifacts** (`.blend`, PNG, GLB/FBX/…) must stay here.

## Prepare the analysis runtime (optional)

```bash
sh-blender setup-analysis
```

Or set `analysis_python` to an existing interpreter. Check the result with
`sh-blender status` (`analysis.available`).

## Use

Invoke `/sh-blender:create-3d-model` (or simply ask for a 3D model). The
orchestrator reads `references/integration.md`, selects the smallest module
set, and calls the `blender_*` MCP tools.

CLI fallback (also `bin/sh-blender` is on the shell PATH when the plugin is
enabled):

```bash
sh-blender list-tools
sh-blender status
sh-blender blender_scene_info --json '{"blend_path":"artifacts/lamp-v1.blend"}'
sh-blender mcp-selftest
```

## Tools

`blender_status` · `blender_scene_info` · `blender_object_info` ·
`blender_import` · `blender_python` · `blender_preview` · `blender_render` ·
`blender_render_frames` · `blender_export` · `blender_validate_scene` ·
`blender_validate_export` · `blender_helper_catalog` · `blender_helper_run`

See `skills/create-3d-model/references/integration.md` for the full tool map.

## Safety boundaries

- One fresh Blender process per call, always with `--disable-autoexec`; embedded
  `.blend` scripts are never auto-executed.
- Inputs and outputs are confined to the task workspace, including after
  resolving symlinks. Overwriting existing files is denied by default.
- `blender_python` has the same privileges as local Python inside Blender. Run
  only reviewed, trusted modeling code.
- Maintenance helpers are blocked unless `enableMaintenanceHelpers` is enabled.
  Three of the 26 helpers are retained upstream maintenance scripts that
  reference repository-level tooling not shipped with this plugin; they remain
  disabled by default and are documented here for completeness.
- No network asset downloads, no AI-generation services, no changes to Blender
  global preferences.

## Development

```bash
node scripts/validate-plugin.js
node --test test/*.test.js
RUN_BLENDER_TESTS=1 node --test test/blender.integration.test.js
RUN_HELPER_TESTS=1 node --test test/helpers.integration.test.js
```

Local verification results are recorded in `docs/VERIFICATION.md`. They are
independent of the upstream author's v0.2.3 verification report and are not
inherited from it.

## Licensing

This plugin's own code is MIT licensed (`LICENSE`, Copyright (c) 2026 SH).
Adapted portions are MIT licensed by their original authors; the three upstream
copyright notices are reproduced in full in `THIRD_PARTY_NOTICES.md` and must
be retained. This project is not an official DeepSeek AI or Blender Foundation
product.
