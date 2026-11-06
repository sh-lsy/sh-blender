# Verification record — sh-blender 1.0.0

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
| Blender | **5.2.2 LTS** (build 2026-09-15) |
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
| V9 | **WorkBuddy desktop integration** | **REGISTERED / PENDING (manual restart)** | `scripts/desktop-plugin.mjs` has registered the plugin as installed + enabled (see "Desktop installation"). `mcp-tool-list.json` is still the 14:59 snapshot with no `blender_*` tools, so the runtime has not re-projected yet. The user must **fully quit and reopen** WorkBuddy (or try `/reload-plugins`), then call `blender_status` and run `/sh-blender:create-3d-model`. **This is the only hard gate before Phase 6 publication.** |
| V10 | Security | **PASS** | V2 asserts `../` traversal and symlink escape are rejected; V5 asserts traversal rejection. Runtime always passes `--disable-autoexec`, uses one fresh Blender process per call, denies overwrite by default, and removes temporary payload/result directories |
| V11 | Compliance | **PASS** | Root `LICENSE` (© 2026 SH), `skills/.../LICENSE` (© 2026 CheshireJCat), `UPSTREAM_LICENSE` (© 2026 RobLe3), `NOTICE`, and `THIRD_PARTY_NOTICES.md` with the three MIT texts in full. No claim of inheriting upstream verification results |
| V12 | Install / uninstall / version refresh | **PENDING (manual)** | Requires desktop-side install → uninstall → reinstall and a version bump check |
| V13 | Push / tag | **PASS** | After the HTTPS proxy recovered, `git push -u origin main` succeeded (`1ac86d8..3dd02e7`) and `git push origin v1.0.0` created the remote tag. GitHub API confirms 120 files on `main`, including `.codebuddy-plugin/plugin.json`, `mcp/server.mjs`, 1 `SKILL.md` and 29 `MODULE.md` |

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

### Still required from the user

`~/.workbuddy/mcp-tool-list.json` was last written at 14:59 and contains no
`blender_*` tools, i.e. the runtime projected its plugin/MCP set **before** the
registration at 15:02. **Fully quit WorkBuddy and start it again** (or try
`/reload-plugins` in chat) so the runtime re-projects. Then verify by calling
`blender_status` or running `/sh-blender:create-3d-model` — not by looking for
a card in the 技能 page.

## Outstanding manual gates

V9 (full restart → `blender_status` → full modeling task) and V12 (uninstall /
reinstall) still require the desktop app. The version-bump half of V12 was
already exercised by a real `--bump patch` run that moved the registration from
`1.0.0` to `1.0.2`; what remains is confirming the restarted app sees the new
tools.

The GitHub repository marketplace entry uses `source: "./"` (self-referential
single repo); that form is supported by the compatible Claude Code plugin format
but has **not** been confirmed by this desktop build. The local `directory`
market with `./plugins/sh-blender` is the verified path. Superseded
`1.0.0` / `1.0.1` cache directories can be removed manually once V9 passes.

## Known limitations

- Directory symlinks require Windows Developer Mode / elevated privileges; the
  corresponding path-guard test is skipped on this host. The guard logic itself
  is present and covered by the traversal and absolute-path tests.
- `codebuddy` / `cc` is not on the shell PATH, so `codebuddy --plugin-dir` was
  not used. Desktop-side validation (V9) must be performed in the WorkBuddy UI.
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
