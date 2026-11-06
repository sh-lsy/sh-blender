# Third-party notices

`sh-blender` is a WorkBuddy-native plugin maintained by `sh-lsy`. Parts of its
runtime and skill content are **adapted from open-source projects under the MIT
License**. Under the MIT terms, the original copyright notices and permission
notices are reproduced below in full and remain in all copies and substantial
portions of the Software. They must not be removed, renamed, or reassigned.

## 1. Provenance chain

| Layer | Project | Version / commit | License | Copyright |
| --- | --- | --- | --- | --- |
| Base runtime and helpers | https://github.com/CheshireJCat/blender | tag `v0.2.4` | MIT | (c) 2026 nekos |
| Bundled modeling skill | https://github.com/CheshireJCat/blender-modeling-skill | adapted copy | MIT | (c) 2026 CheshireJCat |
| Original skill modules | https://github.com/RobLe3/cc-blender-skill | release `1.3.0`, commit `11016c9a5847897491dde935c346571bd7548e3d` | MIT | (c) 2026 RobLe3 |

The intermediate adaptation of `create-3d-model` and the retention of upstream
module recipes are documented in `skills/create-3d-model/references/upstream.md`.

## 2. What was borrowed

- `src/upstream-runtime.js` — adapted from upstream `index.js` (58 KB): the 13
  tool definitions, workspace path guards, process orchestration, helper
  argument validation, and JSON normalization. Local changes: dependency shims,
  plugin-data paths, renamed drivers, host-neutral wording.
- `src/helper-catalog.js` — copied verbatim from upstream `lib/helper-catalog.js`
  (26 helper descriptors; no project-specific identifiers).
- `scripts/sh_blender_driver.py` and `scripts/sh_blender_helper_driver.py` —
  adapted from upstream `scripts/dsh_blender_driver.py` and
  `dsh_blender_helper_driver.py`.
- `skills/create-3d-model/**` — 30 skill documents (1 orchestrator +
  29 modules, the latter renamed to `MODULE.md` for WorkBuddy), 26 Python helper
  scripts, domain references, `LICENSE`, `UPSTREAM_LICENSE`, and `upstream.md`.
- `requirements-analysis.txt` and `assets/sh-blender-lamp-preview.png`.

Not borrowed (removed as host-specific): `cordis.patch.yml`, the upstream
`package.json` `dsh` manifest key and compatibility claims, upstream
`validate-package.js`, DSH profile smoke tests, npm/DSH installation docs, and
`docs/compatibility-v0.2.3.md`. The upstream author-run verification results are
**not** claimed by this project.

## 3. Upstream LICENSE — dsh-blender (root)

Source: https://github.com/CheshireJCat/blender/blob/main/LICENSE

```text
MIT License

Copyright (c) 2026 nekos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 4. Upstream LICENSE — create-3d-model skill

Source: `skills/create-3d-model/LICENSE` (retained unmodified)

```text
MIT License

Copyright (c) 2026 CheshireJCat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 5. Upstream LICENSE — cc-blender-skill

Source: `skills/create-3d-model/UPSTREAM_LICENSE` (retained unmodified)

```text
MIT License

Copyright (c) 2026 RobLe3

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 6. Other names

`DeepSeek Harness` is a separate MIT-licensed project by DeepSeek AI.
`Blender` is a trademark of the Blender Foundation. This plugin is not an
official DeepSeek AI or Blender Foundation product, and is not affiliated with
or endorsed by any upstream author.

## 7. This plugin's own license

The new WorkBuddy adapter code, configuration, documentation and tests are
licensed under the MIT License in the repository root `LICENSE`
(Copyright (c) 2026 SH). Adding this notice does not remove or alter any of the
upstream copyright notices above.
