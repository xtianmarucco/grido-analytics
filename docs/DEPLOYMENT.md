# Deployment (Vercel)

Grido Analytics runs on Vercel as one project: the Express API runs as a single Vercel Function
that also serves the web build (bundled into the function), under one origin (no CORS). Local mode
(`pnpm start` on `127.0.0.1:3001`) is unchanged. Why Vercel and not GitHub Pages: D-47 in
[DECISIONS.md](DECISIONS.md).

Docs checked on 2026-11-02. Re-check them if Vercel changes its Express support.

## How it fits together

```text
Browser ──► <project>.vercel.app ──► Vercel Function: apps/api/src/index.ts (Express)
                                        ├─ /api/*          → routers
                                        ├─ /assets/*, files → web build bundled at apps/api/public
                                        └─ other paths      → index.html (SPA fallback in Express)
```

| Piece                              | What it does                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/index.ts`            | Function entry. Default-exports `createFunctionApp(apps/api/public)`: API + web build, no `listen`.            |
| `apps/api/vercel.json`             | Express preset, build command, region `gru1`, max duration 60 s, `includeFiles: public/**`.                    |
| `pnpm run vercel-build` (apps/api) | Builds `@grido/shared` and `@grido/web`, then copies `apps/web/dist` into `apps/api/public` (git-ignored).     |
| `apps/api/src/server.ts`           | Local only: listens on `HOST:PORT` and serves `apps/web/dist` itself. Vercel ignores it (`src/index.ts` wins). |

Facts this layout relies on:

- Vercel's Express preset uses `src/index.ts` (checked before `src/server.ts`); the file must import
  `express` and default-export the app. The docs say static files go in `public/**` for the CDN,
  but with Root Directory `apps/api` Vercel collects `public/` **before** the build command runs,
  so a `public/` created by the build is never deployed as static files (observed on the first real
  deploy 2026-11-02: only `λ index` was deployed, `/icon.svg` reached Express as 404; reproduced
  with `vercel build` from the repo root; `outputDirectory` and building in `installCommand` do not
  help). The web build is therefore bundled into the function with `includeFiles` and served by
  Express (D-51). The app becomes one function (Fluid compute).
  https://vercel.com/docs/frameworks/backend/express
- A monorepo project points its **Root Directory** at the app folder; pnpm workspaces are
  supported and detected from the root `pnpm-lock.yaml`. https://vercel.com/docs/monorepos
- `vercel.json` sits in the Root Directory; `buildCommand`, `framework`, `regions`, `functions`
  (`maxDuration`) and `rewrites` are documented in
  https://vercel.com/docs/project-configuration/vercel-json
- Node.js 26.x is available (and the default); `engines.node` `>=26` resolves to 26.x.
  https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- Request and response bodies are limited to 4.5 MB (`413 FUNCTION_PAYLOAD_TOO_LARGE`); hence the
  4 MB upload limit (D-48). https://vercel.com/docs/functions/limitations
- Hobby is for personal, non-commercial use; commercial use needs Pro. Vercel Authentication is
  available on Hobby. https://vercel.com/docs/plans/hobby

## Verified locally (2026-11-02)

`npx vercel@latest build` (CLI 65.9.0) on a scratch copy with a hand-written
`.vercel/project.json` (Root Directory `apps/api`, framework `express`, Node 26.x), offline, no
login and no link:

- Build `status: ok`. One function `index.func`: runtime `nodejs26.x`, `maxDuration: 60`,
  framework `express`, with the web build at `apps/api/public` inside the bundle. (An earlier run
  showed static output only because `apps/api/public` was left over from a previous run.)
- The traced function includes `packages/shared/dist`, `exceljs`, `multer` and pdfmake's
  `build/vfs_fonts.js` (the Roboto fonts; no other font files are read).
- The bundle, started on its own, passed the API part of `pnpm smoke` (health, 3 views, PDF and
  Excel of `all`).
- Two pitfalls found and fixed: Vercel's Node builder reads `apps/api/tsconfig.json` without its
  `extends` and compiles with `strict: false` when `module` is missing there (the build then fails
  with a type error), so `module`/`moduleResolution` are repeated in that file. A `functions` key
  `src/index.ts` is silently ignored by the Express preset; the key that applies is `index.js`.

Not verifiable without a real deployment (check on the first one, see the checklist below):
region `gru1` in effect, Vercel's install step with pnpm 11, the web served by the function, the 4.5 MB
platform 413, and Vercel Authentication.

## Vercel project settings

Create the project in the Vercel dashboard: **Add New → Project → Import** the GitHub repository.
Before the first deploy, set:

| Setting (Build and Deployment)                   | Value                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Root Directory                                   | `apps/api`                                                                            |
| Include files outside the Root Directory (Build) | Keep enabled if shown (the build needs `apps/web` and `packages/shared`)              |
| Framework Preset                                 | Express (set by `apps/api/vercel.json`; auto-detected)                                |
| Build Command                                    | Leave default: `pnpm run vercel-build` comes from `vercel.json`                       |
| Output Directory                                 | Leave default (the web build is bundled into the function)                            |
| Install Command                                  | Leave default (no override)                                                           |
| Node.js Version                                  | 26.x                                                                                  |
| Environment variable                             | `ENABLE_EXPERIMENTAL_COREPACK=1` (uses `pnpm@11.17.0` from the root `packageManager`) |
| Function region                                  | `gru1` (São Paulo), set by `vercel.json`                                              |
| Secrets / environment variables for the app      | None                                                                                  |

Do not override the Install Command with a plain `pnpm install`: Vercel then uses the oldest pnpm
in the build image. https://vercel.com/docs/package-managers

`apps/api/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "express",
  "buildCommand": "pnpm run vercel-build",
  "regions": ["gru1"],
  "functions": {
    "index.js": {
      "maxDuration": 60,
      "includeFiles": "public/**"
    }
  }
}
```

No rewrites: every request reaches Express, which serves `/api/*`, the web files and the SPA
fallback (same `createApp({ webDistDir })` as local mode); unknown `/api/*` stays a JSON 404.

## Access and plan (owner's decision)

- **Vercel Authentication (recommended for production):** Settings → Deployment Protection →
  enable Vercel Authentication and make sure it also covers the production deployment. Only people
  logged in to Vercel with access to the project can open the app. The app itself has no login.
- **Plan:** Hobby is free but non-commercial only. If the app is used for the business, Vercel's
  terms call for Pro. This is the owner's decision; nothing in the code depends on the plan.

## First deploy checklist

1. Push the branch; the dashboard builds a Preview deployment. The build log should show
   `pnpm run vercel-build`, `Copied web build to …/apps/api/public` and Node 26.
2. Check **Functions** in the deployment: region `gru1`, max duration 60 s.
3. Run the smoke test from a computer with the repository:

   ```bash
   pnpm smoke https://<deployment-url>
   ```

   With Vercel Authentication on, the smoke test gets Vercel's login page instead of the app.
   Create a _Protection Bypass for Automation_ secret (Settings → Deployment Protection) and run:

   ```bash
   VERCEL_PROTECTION_BYPASS=<secret> pnpm smoke https://<deployment-url>
   ```

   The script sends it as the `x-vercel-protection-bypass` header. Never commit the secret.

4. Open the URL in Chrome, Safari and Firefox: upload a weekly file and download a PDF and an
   Excel report in each.
5. Optional: upload a file larger than 4.5 MB; the page must show "El archivo supera el tamaño
   máximo de 4 MB."
6. If the build fails with a message about the `functions` pattern, remove the `functions` block
   from `apps/api/vercel.json` (the plan's default max duration then applies) and report it.

## Local checks

| Command                                     | What it checks                                         |
| ------------------------------------------- | ------------------------------------------------------ |
| `pnpm start`                                | Local mode on `http://127.0.0.1:3001` (unchanged)      |
| `pnpm smoke` / `pnpm smoke <baseUrl>`       | Page, health, analysis, PDF and Excel against a server |
| `pnpm --filter @grido/api run vercel-build` | The Vercel build step; creates `apps/api/public`       |

`apps/api/public` is generated by `vercel-build`; it is git-ignored and excluded from ESLint and
Prettier, so it can stay after a local run (delete it anytime).
