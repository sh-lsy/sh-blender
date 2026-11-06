# Verification record — sh-blender 1.0.3

Produced locally for this plugin on **2026-11-06**. This record is independent
of the upstream `dsh-blender` v0.2.3 author-run verification report; none of its
results are inherited or claimed here.

## Environment

| Item | Value |
| --- | --- |
| OS | Windows (Git Bash / NTFS) |
| Node.js | v22.22.2 |
| npm / pnpm | 10.9.7 / 11.12.0 |
| Python | 3.13.14 |
| Blender | **5.2.3 LTS** (build 2026-10-22) — upgraded from 5.2.2 on 2026-11-06; portable build at `D:\Blender\blender-5.2.3-windows-x64`, resolved via the user `PATH` entry |
| git | 2.55.0.windows.3, `credential.helper=manager` |
| `codebuddy` CLI | not on PATH (WorkBuddy desktop embeds the runtime) |
| Analysis deps | opencv 4.12.0 / numpy 2.2.6 / Pillow 12.0.0 / scipy 1.16.3 |

## Gates

| # | Gate | Result | Evidence |
| --- | --- | --- | --- |
| V1 | `node scripts/validate-plugin.js` | **PASS** | 10/10 checks: required files, JSON manifests, 1 SKILL.md + 29 MODULE.md, 26 helpers + 26 catalog entries, all catalog paths resolve, 13 tool definitions with valid `inputSchema`, frontmatter, three upstream copyright notices, zero residual host coupling |
| V2 | `node --test test/*.test.js` | **PASS** | 22 tests: 19 pass, 0 fail, 3 skipped (2 opt-in integration, 1 Windows symlink privilege) |
| V3 | MCP stdio bare handshake | **PASS** | `test/mcp-stdio.test.js`: 4 JSON-RPC frames, every stdout line parses as JSON, startup diagnostics on stderr, `initialize` echoes `2025-06-18`, `tools/list` returns 13 tools, `ping` → `{}`, unknown tool → `-32602`. `sh-blender mcp-selftest` also verified version echoing for `2024-11-05`, `2025-03-26`, `2025-06-18`, `2025-11-25`; parse error `-32700`; notifications return no response |
| V4 | `node scripts/setup-analysis.js` | **PASS** | Created `.plugin-data/.venv` (`--system-site-packages`), probe reports all four libraries; `blender_status.analysis.available = true`, executable resolves to the venv Python |
| V5 | `RUN_BLENDER_TESTS=1 node --test test/blender.integration.test.js` | **PASS** | Real Blender pipeline: `blender_status` → `blender_python` (cube + camera + material, `sh_result`) → `scene_info` → `object_info` → `preview` (18 255 B PNG) → `render` → `export` GLB → `validate_export` clean-process re-import → `helper_catalog` 23 / 26 with maintenance enabled → `../escape.blend` rejected |
| V6 | `RUN_HELPER_TESTS=1 node --test test/helpers.integration.test.js` | **PASS** | 23 default / 26 with `enableMaintenanceHelpers`, maintenance helper blocked by default, `wireframe-analyzer` on a 64×64 PGM produced 2 contours and a JSON report |
| V7 | Windows / Unicode paths | **PASS** | Ad-hoc run in workspace `sh-blender 中文 空格 😀`: created `.blend` (94 590 B), preview PNG (18 255 B), `.glb` (1 740 B), helper JSON (1 348 B); Chinese filenames at every stage, including OpenCV-based helper — upstream v0.2.4 Unicode fix retained |
| V8 | CLI fallback | **PASS** | `sh-blender info`, `list-tools` (13), `status`, `mcp-selftest`, and `blender_helper_catalog --json '{}'` (23 helpers) all returned the same structured results as MCP |
| V9 | **WorkBuddy desktop integration** | **PASS (host-confirmed)** | After fixing the `.mcp.json` placeholder bug (see "MCP skip root cause"), the desktop's own catalog scan at 15:26:37 reported `servers=4 -> 5` with no skip warning; `MCP-Reconcile fresh=[custom-mcp:sh-blender]` and `MCP-ControllerState state=ready` (219 ms). `mcp-tool-list.json` was rewritten at 15:26:37 and now lists all 13 `blender_*` tools. A raw handshake against the installed `1.0.3` cache returned `initialize`, 13 tools and `ping`. The skill was renamed from `create-3d-model` to `sh-blender` in 1.0.4 so the slash menu matches `/sh`. |
| V10 | Security | **PASS** | V2 asserts `../` traversal and symlink escape are rejected; V5 asserts traversal rejection. Runtime always passes `--disable-autoexec`, uses one fresh Blender process per call, denies overwrite by default, and removes temporary payload/result directories |
| V11 | Compliance | **PASS** | Root `LICENSE` (© 2026 SH), `skills/.../LICENSE` (© 2026 CheshireJCat), `UPSTREAM_LICENSE` (© 2026 RobLe3), `NOTICE`, and `THIRD_PARTY_NOTICES.md` with the three MIT texts in full. No claim of inheriting upstream verification results |
| V12 | Install / version refresh | **PASS (version half)** | A real `--bump patch` run advanced `1.0.2 -> 1.0.3` across all three manifests, wrote a new versioned cache and repointed `installed_plugins.json`; the desktop picked it up at its next ~10-minute catalog scan **without a restart**. Uninstall / reinstall through the UI remains a manual check |
| V13 | Push / tag | **PASS** | With the proxy unstable, repeated attempts succeeded: `main` reached `6f4d4bf`, then the `1.0.3` commit; remote tags `v1.0.0`, `v1.0.2`, `v1.0.3` present. GitHub API confirms the tree |

## Functional audit — real pagoda asset (1.0.5)

Run against a user-produced 7-tier pagoda (`pagoda-v2.blend`, 15 objects,
12 mesh parts, 13 materials, no UV maps) to exercise the whole tool surface
rather than the synthetic cube used by the automated integration test.

| Tool / helper | Result |
| --- | --- |
| `blender_scene_info` | PASS — 15 objects, 6 collections/materials summary, units, EEVEE, active camera |
| `blender_object_info` | PASS — world bbox, matrix, evaluated mesh, no shape keys/constraints |
| `blender_preview` (front) | PASS — 439 349 B PNG, correct framing, visually inspected |
| `blender_render` (hero camera) | PASS — 951 250 B PNG at 960×960, visually inspected |
| `blender_render_frames` | PASS — frames 1/60, 2 files, 233 232 B |
| `blender_export` glb / obj / stl / ply / usd | PASS — 2.2 MB / 1.8 MB / 2.1 MB / 685 KB / 1.3 MB |
| `blender_export` fbx | **FAILED → fixed in 1.0.5** — `bpy.ops.wm.fbx_export` missing |
| `blender_validate_export` (glb, web) | PASS — re-imported 12 objects, 12 `missing-uv` warnings |
| `blender_validate_export` (stl, 3d-print) | PASS — correctly fails with `non-manifold` |
| `blender_import` (fbx) | PASS after fix — 15 objects, no startup cube |
| `blender_validate_scene` (general/web) | PASS — general clean; web warns `missing-uv` on all 12 meshes |
| `blender_helper_run` surface-texture-coverage-audit | PASS — flags missing UV layers and procedural-only materials |
| `blender_helper_run` animation-contact-sheet | PASS — 87 823 B sheet + diff report |
| Guard rails | PASS — overwrite denied, `../` traversal denied, unknown helper, maintenance helper blocked, bad extension |

Model-level observations (not plugin defects): no UV maps on any mesh (fine for
flat PBR colours, blocks texture baking and `web` profile cleanliness), and
open/non-manifold surfaces throughout, so the model is not 3D-printable.

Artifacts for this audit stay under the git-ignored `artifacts/pagoda-audit/`.

## Desktop installation (no CLI)

### Correction to the earlier guidance

An earlier version of this document told the user to navigate
**Plugins → Marketplaces → `sh-lsy-plugins`**. That path was inferred from the
CLI/TUI documentation and is **wrong for the desktop app**. A screenshot of the
actual UI confirmed the sidebar entry is
**专家 · 技能 · 连接器 → 技能** — the *SkillHub skill market* with skill cards,
a `+ 添加技能` dropdown and an "已安装" tab. A native plugin
(`.codebuddy-plugin/plugin.json` + `.mcp.json` + `bin/`) does not appear as a
card there, and there is no "Plugins → Marketplaces" tab.

Registering only `known_marketplaces.json` was also insufficient: after the
desktop restarted, the entry survived (the app rewrote the file at 14:56 but
kept it), yet `installed_plugins.json` had no `sh-blender` entry and no
`cache/sh-lsy-plugins/` directory existed — so nothing was projected.

### What the desktop actually reads

| File | Role |
| --- | --- |
| `~/.workbuddy/plugins/known_marketplaces.json` | registered marketplaces |
| `~/.workbuddy/plugins/installed_plugins.json` | installed plugins, cache path and version |
| `~/.workbuddy/settings.json` → `enabledPlugins` | enable/disable per `<plugin>@<market>` |
| `~/.workbuddy/plugins/cache/<market>/<plugin>/<version>/` | the actual plugin payload |

`scripts/desktop-plugin.mjs` writes all four, idempotently, with
`*.bak-sh-blender` backups. `--status` prints the state; `--bump patch|minor|major`
bumps the three version files and installs into a new versioned cache directory.

### Installed-side runtime paths

When the desktop loads the plugin from its cache, the host substitutes
`${CODEBUDDY_PLUGIN_DATA}` with its own data directory
(`~/.workbuddy/plugins/data/sh-blender-sh-lsy-plugins`), **not** the project's
`D:\sy\sh-blender\.plugin-data`. The analysis runtime therefore has to exist on
that path:

```bash
SH_BLENDER_DATA="C:/Users/SH/.workbuddy/plugins/data/sh-blender-sh-lsy-plugins" \
  node scripts/setup-analysis.js
```

Without it `blender_status.analysis.available` reports `false` and every Python
helper is unavailable, even though the project-side `.venv` is healthy. This was
the state during the first installed run; after creating the host-side venv the
same `blender_status` call reported Python 3.13.14 with opencv 4.12.0,
numpy 2.2.6, Pillow 12.0.0 and scipy 1.16.3.

### Verified state after direct registration

- `known_marketplaces.json` → `sh-lsy-plugins` present (`type: directory`).
- `installed_plugins.json` → `sh-blender@sh-lsy-plugins` pointing at
  `C:\Users\SH\.workbuddy\plugins\cache\sh-lsy-plugins\sh-blender\1.0.2`
  (version `1.0.2`).
- `settings.json` → `enabledPlugins["sh-blender@sh-lsy-plugins"] = true`.
- The earlier `1.0.0` cache received a `.in_use/<pid>` marker from the desktop at
  15:02:46, showing the runtime detected the newly registered cache directory.
- Manifest, `.mcp.json`, `mcp/server.mjs` and `SKILL.md` all present in cache;
  `mcp/server.mjs` starts standalone and reports 13 tools.
- `--bump patch` was exercised for real: the three version files advanced
  together, a fresh `1.0.2` cache was written (121 files), and
  `installed_plugins.json` was repointed. `--status` reports the new state.
- `node scripts/desktop-plugin.mjs --status` output was verified after the bump.

### MCP skip root cause (found and fixed in 1.0.3)

The registration was correct, but the desktop still reported
`[PluginMcpProvider] skipping MCP server "sh-blender" of sh-blender@sh-lsy-plugins:`
at 15:06 and 15:16, and `mcp-tool-list.json` had no `blender_*` tools.
Inspecting the desktop's own bundled source (`app.asar`) showed why:

- `substitutePluginVariables()` throws `MissingPluginUserConfigError` when a
  `${user_config.KEY}` has no configured value; `loadPluginMcpServers()` catches
  it and **skips the whole server**. `.mcp.json` contained two such keys.
- The same function substitutes only `CLAUDE|CODEBUDDY_PLUGIN_ROOT` and
  `CLAUDE|CODEBUDDY_PLUGIN_DATA`. `${CODEBUDDY_PROJECT_DIR}` is passed through
  verbatim, which would have produced a bogus workspace path.
- Optional settings are already injected into the subprocess as
  `CODEBUDDY_PLUGIN_OPTION_*` by `buildPluginSubprocessEnvironment()`.

Fix: `.mcp.json` keeps only the two supported placeholders; `userConfig` keys
gain `default: ""`; `src/config.js` rejects unresolved `${...}` and resolves the
workspace from `CODEBUDDY_PROJECT_DIR` / `process.cwd()`;
`scripts/desktop-plugin.mjs` now refuses forbidden placeholders. The desktop's
15:26:37 scan then accepted the server (`servers=5`, no warning, `state=ready`).

### Why the slash menu seemed empty

The skill was originally named `create-3d-model` (the plugin is `sh-blender`),
so searching `/sh` in the menu could not match it. It is now named `sh-blender`
along with its directory, so `/sh-blender:sh-blender` resolves and `/sh` matches.
Per the official skills documentation, plugin-provided skills appear under
`/skills` as "Plugin skills" and are marked `locked by plugin`; they are not
cards in the SkillHub market page.

## Outstanding manual gates

- Run a full natural-language modeling task through `sh-blender` in the
  desktop app and inspect the produced `.blend` / PNG / GLB.
- Uninstall / reinstall through the desktop UI (the version-refresh half of V12
  is already proven).
- The GitHub repository `marketplace.json` entry still uses `source: "./"`
  (self-referential single repo); supported by the compatible Claude Code format
  but **not confirmed by this desktop build**. The local `directory` market with
  `./plugins/sh-blender` is the verified path. Superseded `1.0.0`–`1.0.2` cache
  directories can be removed manually.

## Known limitations

- Directory symlinks require Windows Developer Mode / elevated privileges; the
  corresponding path-guard test is skipped on this host. The guard logic itself
  is present and covered by the traversal and absolute-path tests.
- `codebuddy` / `cc` is not on the shell PATH, so `codebuddy --plugin-dir` was
  not used. Desktop loading (V9) was confirmed through the host's own logs and
  tool registry; only the end-to-end modeling task still needs a UI run.
- Three maintenance helpers are retained from upstream but reference
  repository-level tooling that is not shipped; they remain disabled by default
  and are documented as such in both README files.
- The `marketplace.json` entry uses `source: "./"`. This must be confirmed in
  V9 when adding the local directory marketplace; the documented fallback is a
  `plugin/` subdirectory with `source: "./plugin"`.

## Reproduction

```bash
node scripts/validate-plugin.js
node --test test/*.test.js
RUN_BLENDER_TESTS=1 node --test test/blender.integration.test.js
RUN_HELPER_TESTS=1 node --test test/helpers.integration.test.js
node bin/sh-blender mcp-selftest
node bin/sh-blender status
```

## Blender upgrade — 5.2.2 → 5.2.3 LTS (2026-11-06)

Checked `blender.org/download`: the current stable release is **5.2.3 LTS**
(released 2026-10-22); the local portable build was 5.2.2 (2026-09-15), one
patch behind. Blender 5.3 was still listed as upcoming (expected 2026-11-10) and
is not an LTS, so 5.2.3 is the right upgrade target.

- Downloaded `blender-5.2.3-windows-x64.zip` (405 839 452 B) from the NJU
  mirror; SHA-256 `723f08a4…5dc2fb` matches the official
  `blender-5.2.3.sha256`. `download.blender.org` itself returns a Cloudflare
  challenge page to scripted requests, and the Aliyun mirror was ~230 KB/s
  versus ~11 MB/s on NJU.
- Extracted to `D:/Blender/blender-5.2.3-windows-x64`; the 5.2.2 directory is
  kept for rollback. The user `PATH` entry
  `D:/Blender/blender-5.2.2-windows-x64` was replaced (backup of the previous
  value: `D:/Blender/user-path-backup-20261106.txt`).
- Re-verified on 5.2.3: `RUN_BLENDER_TESTS=1` pipeline PASS (41 s),
  `RUN_HELPER_TESTS=1` PASS, FBX export of the pagoda still 519 420 B,
  `blender_status` reports `Blender 5.2.3 LTS`.

### Follow-up findings (continuing the audit on 5.2.3)

| Check | Result |
| --- | --- |
| `blender_python` (bmesh cone + material) | PASS — `sh_result` polygons/vertices returned, 89 219 B `.blend` |
| `blender_preview` (isometric, 480²) | PASS — 158 977 B |
| `blender_validate_scene` animation profile | PASS — correctly fails with `no-object-animation` on a static scene |
| `blender_validate_export` (glb, web) | PASS — 12 objects, no startup cube, 12 `missing-uv` warnings |
| helper `reference-manifest-compiler` | PASS after fix — opaque input now records `alpha_degenerate` and measures by Otsu |
| helper `silhouette-validator` | **Was silently wrong → fixed in 1.0.6.** Opaque renders produced an all-foreground mask and `iou: 1.0` for two different images; now falls back to luminance, reports `mask_mode`, and warns above 98 % coverage |

Silhouette comparison is only meaningful on cut-out images: render with
`blender_render`/`blender_preview` `transparent: true` (alpha then drives the
mask, e.g. bbox `[202, 82, 236, 476]` for the pagoda front view).

## Edge-case sweep (1.0.7)

Second pass aimed at inputs a model would realistically try, not just the happy
path. Run on Blender 5.2.3.

| Case | Result |
| --- | --- |
| Re-import obj / stl / ply / usd / gltf | PASS — 12 / 1 / 1 / 16 / 12 objects (stl+ply are single-mesh formats by design) |
| `blender_export` `selection_only` with one object selected | PASS — 9 124 B subset, not the full 2.2 MB scene |
| `blender_export` `selection_only` with an empty selection | **Fixed in 1.0.7** — used to succeed with a 132-byte GLB / 0 meshes; now errors |
| `blender_render` with an unknown camera | PASS — `Camera "NO-SUCH-CAM" was not found` |
| `blender_preview` with unknown `object_names` | Improved in 1.0.7 — names the missing objects |
| `blender_validate_scene` with an unknown object name | PASS — `missing-objects` + `no-mesh-objects` |
| `blender_helper_run` missing required argument | PASS — `arguments.render is required` |
| `blender_helper_run` with an unknown argument | PASS — `Unknown helper arguments: bogus` |
| `blender_helper_run` blender-runtime helper without `blend_path` | PASS — explicit error |
| `blender_scene_info` `max_objects: 0` | PASS — range error |
| `blender_python` with a blank script | PASS — `script must not be empty` |
| `blender_render` with `frame` outside the scene range | Expected behaviour, no change — Blender allows frames beyond `frame_end` and actions may have keys there |

Not covered by this sweep: GPU/render-engine differences, very large scenes
(10⁶+ polygons), animation/NLA editing, and the 3 maintenance helpers.
