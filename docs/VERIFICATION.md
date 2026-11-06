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
| V9 | **WorkBuddy desktop integration** | **READY / PENDING (manual)** | Marketplace registration is complete on this machine (see "Desktop installation" below). Requires the user to restart the desktop app, install `sh-blender` from the `sh-lsy-plugins` market, confirm the MCP server is green, then run `/sh-blender:create-3d-model`. **This is the only hard gate before Phase 6 publication.** |
| V10 | Security | **PASS** | V2 asserts `../` traversal and symlink escape are rejected; V5 asserts traversal rejection. Runtime always passes `--disable-autoexec`, uses one fresh Blender process per call, denies overwrite by default, and removes temporary payload/result directories |
| V11 | Compliance | **PASS** | Root `LICENSE` (© 2026 SH), `skills/.../LICENSE` (© 2026 CheshireJCat), `UPSTREAM_LICENSE` (© 2026 RobLe3), `NOTICE`, and `THIRD_PARTY_NOTICES.md` with the three MIT texts in full. No claim of inheriting upstream verification results |
| V12 | Install / uninstall / version refresh | **PENDING (manual)** | Requires desktop-side install → uninstall → reinstall and a version bump check |
| V13 | Push / tag | **PASS** | After the HTTPS proxy recovered, `git push -u origin main` succeeded (`1ac86d8..3dd02e7`) and `git push origin v1.0.0` created the remote tag. GitHub API confirms 119 files on `main`, including `.codebuddy-plugin/plugin.json`, `mcp/server.mjs`, 1 `SKILL.md` and 29 `MODULE.md` |

## Desktop installation (no CLI)

The desktop app registers marketplaces in
`C:\Users\SH\.workbuddy\plugins\known_marketplaces.json`. A `directory` entry
named `sh-lsy-plugins` was added (the original file was backed up to
`known_marketplaces.json.bak-sh-blender-20261106`), pointing at
`D:\sy\sh-blender-marketplace`. That directory is a clean snapshot produced by
`scripts/sync-local-marketplace.mjs` and uses the officially observed
`./plugins/sh-blender` layout.

Verified before hand-off:

- `marketplace.json` parses; its `source` resolves to a directory containing
  `.codebuddy-plugin/plugin.json`, `.mcp.json`, `mcp/server.mjs` and
  `skills/create-3d-model/SKILL.md`.
- `plugin.json` name/version match the marketplace entry (`sh-blender` / `1.0.0`).
- `mcp/server.mjs` starts from the marketplace copy with
  `SH_BLENDER_ROOT` pointing there and reports 13 tools; startup diagnostics
  go to stderr.

User steps: restart WorkBuddy → **Plugins → Marketplaces → `sh-lsy-plugins`**
→ install `sh-blender` → `/reload-plugins` → confirm MCP green → run
`/sh-blender:create-3d-model`. For other machines, add the GitHub marketplace
address `sh-lsy/sh-blender` from the **+** button instead.

## Outstanding manual gates

V9 and V12 require interaction with the WorkBuddy desktop UI. The GitHub
repository marketplace entry still uses `source: "./"` (self-referential single
repo); that form is supported by the compatible Claude Code plugin format but
has **not** been confirmed by this desktop build. The registered local
`directory` market uses the verified `./plugins/sh-blender` layout and is the
recommended path until V9 confirms the GitHub form.

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
