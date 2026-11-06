---
name: sh-blender
description: Blender 3D 建模与生产编排 —— 从文本、参考图、线框、正交多视图、贴图模板或已有 3D 资产创建并验证可移植 3D 模型；通过 sh-blender 插件的 blender_* MCP 工具驱动 Blender 后台进程。当用户要求建模、重建、材质 UV、绑定动画、视觉验证或导出 GLB/glTF/FBX/OBJ/USD/STL 时使用。Create and refine portable 3D models with the sh-blender MCP tools and Blender.
---

# sh-blender — 3D production orchestrator

## WorkBuddy runtime mapping

This plugin runs inside WorkBuddy, not inside DeepSeek Harness. The 13 `blender_*` tools are exposed by the plugin's local MCP server (or, if MCP is unavailable, by the `sh-blender` CLI through the shell). Use `blender_status` before the first modeling call, and use `blender_helper_catalog` before `blender_helper_run`.

**This section overrides any older tool-name, module-loading, or path instructions in the bundled module documents.** Modules are plain reference documents under `references/modules/<name>/MODULE.md`; read them with `@references/modules/<name>/MODULE.md` instead of trying to invoke a separate skill tool. All output paths stay inside the current task workspace.


Turn text, images, wireframes, multiview references, or existing assets into validated 3D models. Use Blender as the production backend and editable source environment, not as the definition of the product. Inspect the inputs and open scene, route the request to the smallest relevant module set, execute controlled `bpy` changes, inspect visual evidence, iterate, export the model, and preserve the engineering source.

This plugin bundles the complete 30-part capability stack: one auto-triggered orchestrator (this file) plus 29 domain module documents under `references/modules/`. Read only the modules required by the request.

## Start here

1. Read [references/integration.md](references/integration.md) before the first Blender tool call in a task.
2. Read [references/capability-map.md](references/capability-map.md) and select only the skills needed for the request.
3. Read a selected module with `@references/modules/<module-name>/MODULE.md` (for example `@references/modules/blender-modeling/MODULE.md`). Resolve that module's `references/...` and `scripts/...` paths relative to its own directory.
4. Treat this file and `integration.md` as higher priority than a vendored module when tool naming, scene safety, output paths, or runtime guidance differs.

Do not read every module preemptively. Load the orchestrator or domain module first, then follow a dependency only when its gate is reached.

## Discover Blender capabilities

- Call `blender_status` before the first modeling operation. It reports Blender, the analysis runtime, registered skills, helpers, and workspace.
- Use `blender_scene_info` and `blender_object_info` for structural inspection. Use `blender_import` before editing a non-Blend asset.
- Use `blender_python` for controlled `bpy` changes, `blender_preview` for camera-free blockout evidence, `blender_render` or `blender_render_frames` for presentation/animation evidence, and `blender_export` for portable deliverables.
- Run `blender_validate_scene` before export and `blender_validate_export` after export. For reference, wireframe, contour, multiview, UV, texture, look, repair, or animation QA, discover and run deterministic helpers through `blender_helper_catalog` and `blender_helper_run`.
- If `blender_status.available` is false, stop and report the executable/configuration error. Do not claim Blender work completed while the backend is unavailable.
- Every file path must stay inside the current task workspace unless the plugin was explicitly configured otherwise. Keep Poly Haven, Sketchfab, Hyper3D, Hunyuan3D, and other network asset or generation features disabled unless the user explicitly requests them.

## Follow the production workflow

### 1. Establish the target

- Classify the input as text-only, single-image, multiview or orthographic, wireframe or technical drawing, texture or template pack, or an existing 3D asset. Combine modalities when the user supplies more than one.
- Extract the subject, intended use, style, dimensions, reference priority, primary delivery format, target runtime, animation requirements, and quality bar.
- Inspect every provided image before modeling. Record views, landmarks, silhouettes, part counts, material regions, uncertainties, and contradictions.
- For a single image, state depth, scale, occlusion, and unseen-surface assumptions. For multiple images, register their view relationship before adding depth.
- Use reversible defaults when missing information does not materially change the result. Ask one focused question only when a choice changes geometry, topology, animation, source-of-truth policy, or delivery.
- Read [references/core/common-object-dimensions.md](references/core/common-object-dimensions.md) for common subjects; prefer user-provided or authoritative dimensions.

### 2. Inspect before mutating

- Inspect the scene before the first write. Inspect each object in scope with `blender_object_info` and obtain a camera-free `blender_preview` when image capture is needed.
- If the input is GLB/glTF, FBX, OBJ, STL, USD, PLY, or DAE, call `blender_import` and continue from its versioned `.blend` output.
- Treat existing objects, collections, materials, lights, cameras, worlds, actions, and files as user-owned.
- Do not clear the scene, reset the world, delete the default cube, or replace the camera merely because a recipe starts from a blank scene.
- Delete startup content only when the user requested a fresh scene and inspection proves it is unchanged startup content. Otherwise create a task-specific collection and leave unrelated data alone.
- Save a versioned checkpoint before broad or destructive work. Never overwrite the user's original `.blend` without explicit authorization.

### 3. Route and plan

- For a complete scene or multi-stage asset, load `blender-pro-workflow` first, then the required domain modules.
- For multi-module or source-locked work, load `blender-skill-harmonizer` so one module owns each decision and handoff.
- For exact reference work, establish a source manifest and validation gates before creating geometry. Do not mix plausible freeform modeling with 1:1 reconstruction after fitting begins.
- Define units, origin, up axis, long/broad/thin axes, object boundaries, stable names, collection ownership, modifier strategy, output paths, and validation views before executing code.
- Prefix newly created data with `GEO-`, `MAT-`, `LGT-`, `CAM-`, `ARM-`, `COL-`, or `WGT-`.

### 4. Build from blockout to detail

- Follow [references/core/assembly-order.md](references/core/assembly-order.md) for multi-phase work.
- Establish dimensions, silhouette, camera framing, and part connectivity with the fewest primitives or contours needed.
- Capture and inspect a blockout screenshot before adding secondary detail. Fix scale, orientation, silhouette, framing, disconnected parts, and source registration first.
- Prefer Blender's data API or `bmesh` for deterministic edits. Use `bpy.ops` only with explicit active object, selection, mode, and context.
- Treat every code-execution call as a fresh Python namespace. Re-import modules and retrieve persistent Blender data by stable name.
- Split work into small, purposeful, retryable chunks. Prefer idempotent creation and update code; print compact structured evidence after each chunk.
- On timeout or error, diagnose and retry only the failed chunk. Do not replay an entire scene build blindly.

### 5. Validate structure and appearance

- After each significant phase, verify names, transforms, dimensions, origins, hierarchy, modifiers, topology counts, normals, UVs, materials, actions, accidental duplicates, and file paths relevant to the task.
- Create and inspect a `blender_preview` image after blockout and final refinement. For look development, camera, lighting, render, texture, or animation work, inspect purposeful camera renders as well.
- After `blender_render`, call WorkBuddy's image viewer on the saved PNG/JPEG and inspect the returned image. A successful tool call or non-empty image file is not visual validation.
- For animation, use `blender_render_frames`, generate a contact sheet with the `animation-contact-sheet` helper, inspect it, and load `animation-quality-gate`.
- For reference-locked work, use measurable masks, landmarks, overlays, bboxes, centroids, IoU/SSIM where appropriate, and multiview gates. A front-view match alone does not prove a 3D match.
- If no image can be inspected, report `structurally verified, visually unverified`.
- Identify the largest visible mismatch, change the smallest upstream cause, re-capture the same view, and compare before and after. Do not hide geometry errors with camera, lighting, or crop tricks.

### 6. Save and hand off

- Treat the transferable 3D model as the primary artifact. Use the user's requested format; when none is specified, export a single-file `.glb` and save a versioned `.blend` engineering source.
- Treat `.blend` as the editable project file, not the only proof that a 3D model was delivered. A preview is visual QA, not a substitute for the exported model.
- Let explicit 3D-printing, engine, CAD-interchange, render-only, animation-only, or existing-project targets override the default `.glb` contract.
- Write final artifacts to absolute paths in the active current task workspace or another explicitly configured durable directory, never `/tmp` or an internal driver path.
- Verify every deliverable exists, is non-empty, and matches its requested format. Re-import or inspect the export when practical to catch missing geometry, textures, materials, axes, scale, or animation.
- Report created or changed objects, important dimensions and topology, modules used, validation evidence, and remaining limitations.
- End with an `Artifacts` section. Link each verified output with a descriptive Markdown label and its absolute local path. List the primary model first, the versioned `.blend` source second, and previews or additional exports after them. List each path once and never fabricate an artifact link.

## Run bundled helpers

The plugin exposes every upstream helper through a workspace-scoped whitelist. Before running one:

1. Load the owning domain skill.
2. Call `blender_helper_catalog`, optionally filtered by module, and use the exact returned argument names.
3. Call `blender_helper_run`; pass workspace paths and new versioned output/report paths. Blender-runtime helpers also require `blend_path`.
4. Keep reports, masks, overlays, contact sheets, and generated recipes in the active workspace.
5. Inspect generated masks, overlays, and contact sheets with WorkBuddy's image viewer; do not trust metrics alone. Treat generated Blender recipes as plans and review Python before execution.

If `blender_status.analysis.available` is false, run the package's `sh-blender setup-analysis` once or configure `analysisPythonExecutable` to a Python environment containing OpenCV, NumPy, Pillow, and SciPy. Do not silently skip a required helper.

Do not run release, documentation, commit, or push steps from `quality-refinement-autoloop` unless the user explicitly asks to develop or publish the skill itself. For normal modeling, use that module only to diagnose the artifact and plan a scoped repair.

## Enforce safety boundaries

- Review downloaded, generated, or user-supplied Python before execution.
- Do not enable global script auto-execution, install add-ons, download assets, call paid services, or change Blender preferences unless explicitly requested.
- Do not perform scene-wide deletion, destructive remeshing, modifier application across unrelated objects, mass relinking, or overwrite saves without authorization.
- Do not claim production human anatomy from primitive recipes. Use an authorized base mesh, sculpt workflow, or specialist when required.
- Redirect engineering-grade CAD tolerances, simulation validity, and manufacturing certification to appropriate CAD or CAE workflows.

## References

- [capability-map.md](references/capability-map.md): all 29 routed modules and recommended pipelines.
- [integration.md](references/integration.md): WorkBuddy tool mapping, module loading, workspace boundaries, and artifact handoff.
- [modeling-patterns.md](references/modeling-patterns.md): compact agent-oriented modeling and topology patterns.
- [visual-validation.md](references/visual-validation.md): image inspection gates and correction loop.
- [blender-5-compat.md](references/blender-5-compat.md): Blender 5.x API compatibility notes.
- [upstream.md](references/upstream.md): provenance, retained capabilities, adaptations, and license notice.
