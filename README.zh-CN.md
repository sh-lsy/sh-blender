# sh-blender

[English](README.md)

由 [sh-lsy](https://github.com/sh-lsy) 维护的 **WorkBuddy 原生 Blender 插件**，提供完整的 Blender 3D 生产流程：**13 个工作区受限工具、30 份技能文档、26 个确定性 Helper**。

它**不是** Blender `bpy` 附加组件，不需要安装 Blender 插件或开放控制端口；每次调用都启动一个独立的 Blender 后台进程。它也**不是** DeepSeek Harness 插件：运行时已适配为 WorkBuddy 插件体系（`.codebuddy-plugin/plugin.json` + `skills/` + `.mcp.json` + `bin/`）。上游 MIT 授权与来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 能力一览

| 项目 | 数量 | 说明 |
| --- | ---: | --- |
| 工具 | 13 | `blender_status` … `blender_helper_run`，以带 `inputSchema` 的 MCP 工具暴露 |
| 技能文档 | 30 | 1 个自动触发的编排 Skill + 29 个按需读取的模块文档 |
| Helper | 26 | 默认启用 23 个，3 个维护类需显式开启 |
| 运行时第三方依赖 | 0 | 仅用 Node 内置模块，插件安装时无需 `npm install` |

29 个模块文档位于
`skills/create-3d-model/references/modules/<名称>/MODULE.md`，通过
`@references/modules/<名称>/MODULE.md` 按需读取。只注册 1 个自动触发技能，避免
30 条元数据常驻上下文，同时保留全部 30 份内容。

## 环境要求

- WorkBuddy 桌面端（Windows / macOS / Linux）
- Node.js 22.12+（由 WorkBuddy 宿主提供；本插件无依赖）
- Blender 4.3+ 在 `PATH` 中，或通过 `blender_executable` 选项指定绝对路径
- 仅 26 个 Helper 需要 Python 3.10+ 及 OpenCV / NumPy / Pillow / SciPy；13 个核心工具不需要

## 在 WorkBuddy 桌面端安装（无需 CLI）

**先说清楚界面**：桌面端侧边栏那个入口是 **「专家 · 技能 · 连接器 → 技能」**，
里面是 **SkillHub 技能市场**（一张张带 `+` 的技能卡片，加「已安装」标签页，
右上角「+ 添加技能」）。**原生插件不会在这里显示成卡片**，桌面端也**没有**
「插件 → 市场」这种标签页。原生插件由桌面端内嵌的插件运行时加载，状态在
`~/.workbuddy/plugins/` 里。

所以最稳的做法是**直接写配置，不用点界面**，一条命令：

```bash
node scripts/desktop-plugin.mjs
```

脚本会（可重复运行）：

1. 刷新干净的本机市场快照 `../sh-blender-marketplace`（调用
   `scripts/sync-local-marketplace.mjs`）。
2. 把快照复制到版本化缓存
   `~/.workbuddy/plugins/cache/sh-lsy-plugins/sh-blender/<版本>/`。
3. 写入桌面端读取的三处状态：`known_marketplaces.json`（市场）、
   `installed_plugins.json`（安装路径与版本）、`~/.workbuddy/settings.json`
   的 `enabledPlugins`（启用）。首次改动前都会备份成 `*.bak-sh-blender`。
4. 校验清单、`.mcp.json`、MCP server、`SKILL.md` 是否齐全。

然后**完全退出 WorkBuddy 再重新打开**（只关窗口不够，插件在启动时投影）。
也可以先在对话里试 `/reload-plugins`。

**怎么确认装好了** —— 别去「技能」页找卡片，直接试能力：

- 让 Agent 调用 `blender_status`（正常会返回 Blender 5.2.2 LTS）。
- 或运行 `/sh-blender:create-3d-model` 提一个建模需求。
- `node scripts/desktop-plugin.mjs --status` 查看注册状态。

### 改了代码之后怎么更新

```bash
node scripts/desktop-plugin.mjs --bump patch     # 1.0.0 → 1.0.1 并安装
node scripts/desktop-plugin.mjs --bump minor     # 1.0.0 → 1.1.0
node scripts/desktop-plugin.mjs                  # 覆盖当前版本（快速联调）
```

`--bump` 会同步提升 `plugin.json`、`package.json`、`marketplace.json` 三处版本，
重建快照，写入**新的版本化缓存目录**，并把 `installed_plugins.json` 指过去。
桌面端按版本做缓存键，升版本才能保证真正重新加载；不带 `--bump` 是覆盖同版本
目录，适合快速迭代，但同样要重启应用。更新后完全重启 WorkBuddy，再用
`blender_status` 复验。建议运行脚本前先退出桌面端，因为它在启动时会重写这些 JSON。

### 分享给其他机器

GitHub 仓库 `https://github.com/sh-lsy/sh-blender` 自带
`.codebuddy-plugin/marketplace.json`。若桌面端「+ 添加技能」支持仓库/市场地址，
可填 `sh-lsy/sh-blender`；否则克隆仓库后在目标机器跑一次
`node scripts/desktop-plugin.mjs`。

> WorkBuddy 安装插件只是把目录复制到版本化缓存，**不会执行 `npm install`**，所以本插件刻意保持零第三方 Node 依赖。

## 配置

`plugin.json` 声明两个非敏感用户选项：

| 选项 | 默认 | 含义 |
| --- | --- | --- |
| `blender_executable` | 空 → PATH 中的 `blender` | Blender 可执行文件的绝对路径 |
| `analysis_python` | 空 → `${CODEBUDDY_PLUGIN_DATA}/.venv` | 已装 OpenCV/NumPy/Pillow/SciPy 的 Python |

运行期默认值（`src/config.js`）：

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

三个位置严格分离：

- `${CODEBUDDY_PLUGIN_ROOT}`：只读的插件代码与技能资源。
- `${CODEBUDDY_PLUGIN_DATA}`：临时 payload/result JSON 与可选 `.venv`，插件更新后保留。
- `${CODEBUDDY_PROJECT_DIR}`：当前任务工作区，**所有用户可见产物**（`.blend`、PNG、GLB/FBX…）只能写在这里。

## 分析环境（可选）

```bash
sh-blender setup-analysis
```

也可把 `analysis_python` 指向已有的解释器，用 `sh-blender status` 检查
`analysis.available`。

## 使用

调用 `/sh-blender:create-3d-model`（或直接提出建模需求）。编排技能会读取
`references/integration.md`，选择最小模块集，并调用 `blender_*` MCP 工具。

CLI 兜底（插件启用时 `bin/sh-blender` 会加入 shell PATH）：

```bash
sh-blender list-tools
sh-blender status
sh-blender blender_scene_info --json '{"blend_path":"artifacts/lamp-v1.blend"}'
sh-blender mcp-selftest
```

## 13 个工具

`blender_status` · `blender_scene_info` · `blender_object_info` ·
`blender_import` · `blender_python` · `blender_preview` · `blender_render` ·
`blender_render_frames` · `blender_export` · `blender_validate_scene` ·
`blender_validate_export` · `blender_helper_catalog` · `blender_helper_run`

完整映射表见 `skills/create-3d-model/references/integration.md`。

## 安全边界

- 每次调用独立 Blender 进程，始终带 `--disable-autoexec`；`.blend` 内嵌脚本不会自动执行。
- 输入与输出限制在任务工作区内，并解析符号链接真实目标；默认拒绝覆盖已有文件。
- `blender_python` 与 Blender 内运行本地 Python 权限相同，只执行经过审阅的可信建模代码。
- 维护类 Helper 默认关闭。26 个 Helper 中有 3 个是上游遗留的维护脚本，引用的仓库级工具未随插件分发，故保留但默认禁用，此处如实说明。
- 不下载网络素材、不启用 AI 生成服务、不修改 Blender 全局偏好。

## 开发验证

```bash
node scripts/validate-plugin.js
node --test test/*.test.js
RUN_BLENDER_TESTS=1 node --test test/blender.integration.test.js
RUN_HELPER_TESTS=1 node --test test/helpers.integration.test.js
```

本地验证结果记录在 `docs/VERIFICATION.md`，为本仓库独立实测，不继承上游
v0.2.3 的作者验证结论。

## 许可与来源

本插件自有代码采用 MIT（`LICENSE`，Copyright (c) 2026 SH）。借鉴部分仍归原作者所有，三条上游版权声明在 `THIRD_PARTY_NOTICES.md` 中全文保留，不得删除或改写。本项目不是 DeepSeek AI 或 Blender Foundation 的官方产品。
