# RhineLabUI direct integration

The Archive Gallery uses the upstream RhineLabUI project directly as its Three.js archive-array runtime.

- Upstream: https://github.com/LBEILC/RhineLabUI
- Author: LBEILC
- License: MIT
- Pinned commit: `8799b03179a9a0ebd2611843e644a5a0530b24bf`

## How it works

`npm run sync:rhinelab` clones/resets the upstream project into `.vendor/rhinelab-ui`, applies a small Writing-Time compatibility patch, builds the original Vite application, and writes the generated runtime to `public/rhinelab`.

The compatibility patch intentionally stays narrow:

1. `src/data.ts` reads archive metadata from `localStorage` key `writing-time-rhine-records` instead of the upstream static archive JSON.
2. Selection events are forwarded to the parent Writing-Time page with `postMessage`.
3. In embed mode, opening an archive forwards an image-open event instead of entering the upstream research-document detail screen.
4. A few standalone terminal navigation elements are hidden only when `?embed=1` is present.

The Three.js scene, GLB archive cassette, camera, drag/navigation behavior, archive loop logic, visibility system, materials, lighting, post-processing, animations, and responsive layout continue to come from RhineLabUI itself.

## Local development

RhineLabUI currently requires Node.js 22.12 or newer. Writing-Time therefore uses the same minimum Node version for this integration.

Run:

```bash
npm install
npm run dev
```

`predev` automatically executes the upstream sync/build. Production `npm run build` does the same through `prebuild`.

Generated folders are ignored by Git:

- `.vendor/rhinelab-ui`
- `public/rhinelab`

The generated runtime includes `RHINELABUI-LICENSE.txt` and `UPSTREAM.txt` for attribution and reproducibility.

## Updating upstream

Do not silently track `main`. Update `UPSTREAM_COMMIT` in `scripts/sync-rhinelab-runtime.mjs`, run `npm run sync:rhinelab`, verify the bridge patch points still apply, then test the gallery before committing the new pinned revision.
