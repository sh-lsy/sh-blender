# WorkBuddy integration

This document is the runtime contract for `sh-blender` inside WorkBuddy. It has
higher priority than any older tool-name, module-loading, or path guidance in
the bundled module documents under `references/modules/`.

## 1. Where the tools come from

`sh-blender` is a WorkBuddy plugin. It bundles:

- **One auto-triggered skill**: `sh-blender` (this skill).
- **29 domain module documents**: `references/modules/<name>/MODULE.md`, plain
  reference files read on demand. They are not separately registered skills.
- **13 `blender_*` tools**, exposed by the plugin's local MCP server
  (`.mcp.json` → `mcp/server.mjs`). Each tool has a typed `inputSchema`.
- **26 deterministic helpers**, discovered with `blender_helper_catalog` and
  executed with `blender_helper_run`. Three maintenance helpers are disabled by
  default.
- **A CLI fallback**: `bin/sh-blender` is added to the shell PATH when the
  plugin is enabled. If the MCP server is unavailable, call the same tools via
  `sh-blender <tool> --json '<arguments>'`.

Call `blender_status` before the first modeling operation. It reports the
Blender version, the analysis Python runtime, the resolved task workspace, the
helper count, and the registered capabilities. If `available` is false, stop and
report the configuration problem; do not claim modeling work completed.

## 2. Tool map

| Tool | Use it for |
| --- | --- |
| `blender_status` | Blender/analysis/workspace/capability probe |
| `blender_scene_info` | Read-only scene summary (objects, transforms, materials, topology, cameras, units) |
| `blender_object_info` | Object-level evaluated geometry, UVs, constraints, shape keys, animation |
| `blender_import` | Convert GLB/glTF/FBX/OBJ/STL/USD/PLY/DAE into a versioned `.blend` |
| `blender_python` | Reviewed `bpy`/`bmesh` chunk, saves a versioned `.blend` |
| `blender_preview` | Camera-free blockout preview (isometric/front/back/left/right/top/bottom) |
| `blender_render` | Single still PNG/JPEG visual evidence |
| `blender_render_frames` | Representative animation frames for QA |
| `blender_export` | GLB/glTF/FBX/OBJ/STL/USD/PLY export |
| `blender_validate_scene` | Target-aware scene audit (`general`/`web`/`3d-print`/`animation`) |
| `blender_validate_export` | Clean-process re-import validation of an exported asset |
| `blender_helper_catalog` | Discover the 26 whitelisted helpers and their exact arguments |
| `blender_helper_run` | Run one whitelisted helper with structured arguments |

Call `blender_helper_catalog` before `blender_helper_run`; never guess helper
script paths. Maintenance helpers stay blocked unless
`enableMaintenanceHelpers` is explicitly enabled.

## 3. Loading domain modules

Read a module with `@references/modules/<module-name>/MODULE.md` (for example
`@references/modules/blender-modeling/MODULE.md`). Pick the smallest module set
from `references/capability-map.md`. Do not read all 29 modules preemptively.

Three relative-path bases must not be confused:

- `references/...` paths mentioned in this orchestrator resolve relative to the
  `sh-blender` skill root.
- `references/...` and `scripts/...` paths inside a module resolve relative to
  that module's own directory.
- Helper entries in `blender_helper_catalog` use
  `references/modules/<module>/scripts/<file>.py` relative to the
  `sh-blender` skill root. The tool resolves these automatically.

## 4. Workspaces and paths

- **User-visible deliverables** (`.blend`, previews, renders, GLB/FBX/…) belong
  in the current task workspace (`${CODEBUDDY_PROJECT_DIR}`, reported by
  `blender_status` as `workspaceRoot`). Use workspace-relative paths such as
  `artifacts/lamp-v1.glb`.
- **Plugin-internal state** (temporary payload/result JSON, the optional
  `.venv`) lives in `${CODEBUDDY_PLUGIN_DATA}` and is never a deliverable.
- **Plugin code and skill resources** live in `${CODEBUDDY_PLUGIN_ROOT}` and are
  read-only at runtime.
- With the default `restrictToWorkspace: true`, both relative and absolute
  input/output paths must stay inside the task workspace, including after
  resolving existing symlinks. Overwriting existing files is denied by default;
  use a versioned filename or set `allow_overwrite: true`.
- Never write final artifacts under `/tmp` or into an internal driver path.
  Older module recipes show `artifacts/...` placeholders — replace them with
  concrete task-workspace paths.

## 5. Visual evidence

After `blender_preview`, `blender_render`, or `blender_render_frames`, open the
generated image with WorkBuddy's image viewer and actually inspect it. A
successful tool call or a non-empty file is not visual validation. If no image
can be inspected, report `structurally verified, visually unverified`.

## 6. Analysis runtime

The 13 core Blender tools only need Blender 4.3+ (5.x API supported). Helpers
that use reference images, wireframes, contours, or overlays additionally need
Python 3.10+ with OpenCV, NumPy, Pillow, and SciPy. Prepare it once with:

```bash
sh-blender setup-analysis
```

This creates `${CODEBUDDY_PLUGIN_DATA}/.venv`. Alternatively set the plugin's
`analysis_python` user option to an existing interpreter. If
`blender_status.analysis.available` is false, do not silently skip a required
helper.

## 7. Safety boundaries

- Every tool call launches a fresh Blender background process with
  `--disable-autoexec`; `.blend` embedded scripts are never auto-executed.
- `blender_python` has the same privileges as local Python inside Blender.
  Only run reviewed, trusted modeling code. Do not use it to download assets,
  read credentials, install packages, start unrelated processes, or change
  Blender global preferences.
- Treat existing objects, collections, materials, cameras, lights, and files as
  user-owned. Inspect before mutating; save versioned checkpoints; never clear a
  scene merely because a recipe starts from a blank one.
- Keep external asset and AI-generation services disabled unless the user
  explicitly asks for them.
- Do not run release, documentation, commit, or push steps from
  `quality-refinement-autoloop` during ordinary modeling work.

## 8. Artifact handoff

Treat the portable 3D model as the primary artifact and the versioned `.blend`
as its editable engineering source. When no format is requested, export a
single-file `.glb` plus a versioned `.blend`. Verify each deliverable exists, is
non-empty, and re-imports cleanly with `blender_validate_export`. End the task
with an `Artifacts` section listing primary model first, `.blend` source second,
then previews and extra exports — each with a descriptive label and a task
workspace path, listed once, never fabricated.
