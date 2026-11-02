# Feature: sprint-7-vercel-deploy

## Objective

Make Grido Analytics deployable and working on Vercel (web + Express API as a Vercel Function), fix the Sprint 5 download follow-ups that matter across browsers, and document deployment and use. Offline use and double-click launchers are deferred (user decision 2026-11-02).

## Problem / Why

The owner will publish the app on the web. GitHub Pages cannot run the Express backend (static only), so Vercel was chosen (user decision 2026-11-02). Verified Vercel constraints (docs, 2026-11-02):

- Express deploys with zero configuration as a single Vercel Function; entry file must default-export the app (or listen) at e.g. `src/index.ts`/`src/app.ts`/`server.ts` of the project root. https://vercel.com/docs/frameworks/backend/express
- `express.static()` is ignored on Vercel; static assets must be in `public/**` (served by the CDN). Same page.
- Request/response body limit 4.5 MB (`413 FUNCTION_PAYLOAD_TOO_LARGE`). https://vercel.com/docs/functions/limitations
- Default region `iad1`; changeable (target `gru1`, São Paulo). Hobby max duration 300 s, 2 GB memory.
- Hobby is non-commercial only; Vercel Authentication (deployment protection) is available on Hobby for production. https://vercel.com/docs/plans/hobby

## Scope

- T1 Vercel build layout: Vercel project targets the repo (monorepo, pnpm workspaces). Express entry that default-exports `createApp()` without `listen` and without the `express.static`/SPA fallback (CDN serves the web build from `public/`); keep local `server.ts` (listen + static serving) working unchanged for `pnpm start`. Build step produces the web build where Vercel serves static files and the API function under the same origin (`/api/*`), with SPA fallback for non-API routes via `vercel.json` rewrites if needed. `vercel.json`: region `gru1`, function config (maxDuration modest, e.g. 60 s), no secrets. Verify against current Vercel docs (monorepo + Express + pnpm) and document the exact Vercel project settings (Root Directory, Build Command, Output, Install) the owner must set.
- T2 Upload limit 4 MB (below the 4.5 MB platform limit incl. multipart overhead) everywhere (API constant, web copy "hasta 4 MB", docs); Spanish error message unchanged in shape. Handle a platform 413 HTML/text response in the web client as the same "archivo demasiado grande" message.
- T3 Sprint 5 follow-ups: delay `URL.revokeObjectURL` after click (e.g. setTimeout ~ 30 s or on next tick + safe delay; document); reset export mutation state when the view changes and disable the view selector (and buttons) while a report is generating; fix tests that mutate global `URL` / leave the anchor click spy (use `vi.stubGlobal` with fresh objects and restore spies).
- T4 Deployment smoke script `pnpm smoke <baseUrl>` (Node, no new deps): uploads a generated fictitious `.xlsx` (exceljs already present) to `<baseUrl>/api/analysis`, checks 3 views, then `/api/exports/pdf` and `/xlsx` for `all` (status, content type, `%PDF-`, xlsx sheet names). Works against local `pnpm start` and against the deployed URL.
- T5 Docs: `docs/DEPLOYMENT.md` (Vercel steps: connect GitHub repo, project settings, region, Vercel Authentication recommendation, Hobby vs Pro note, verifying with `pnpm smoke`), `docs/GUIA_DE_USO.md` in neutral Spanish for the owner (upload, sections, exports, error messages), README links, DECISIONS (Vercel, 4 MB, offline deferred), ARCHITECTURE (deployment topology).

Out of scope: offline/PWA, double-click launchers, authentication inside the app, persistence, GitHub Pages.

## Constraints

- Business logic unchanged; backend stays the single source of truth.
- Same-origin `/api` in production (no CORS).
- No secrets in the repo; no Vercel CLI login or deployment by the agent — the owner connects the repo in the Vercel dashboard.
- Fictitious names in tests and smoke fixtures; real file never committed.
- Test-first where a deterministic test applies.

## Acceptance criteria

1. Local `pnpm start` still serves web + API on 127.0.0.1:3001.
2. A Vercel build of the repo serves the web from the CDN and `/api/*` from the Express function (verified by the owner's deploy + `pnpm smoke <url>`).
3. Upload limit 4 MB with clear Spanish message, including platform 413.
4. Downloads work in Chrome, Safari and Firefox (Safari/Firefox confirmed by the owner); export state does not leak across views.
5. `pnpm typecheck|lint|format:check|test|build` pass; `pnpm smoke http://127.0.0.1:3001` passes.

## Tasks

- [x] T1 Vercel build layout + `vercel.json` + Express function entry.
- [x] T2 Upload limit 4 MB + platform 413 handling.
- [x] T3 Sprint 5 download/export follow-ups + test cleanup.
- [x] T4 `pnpm smoke <baseUrl>`.
- [x] T5 Docs (DEPLOYMENT, GUIA_DE_USO, README, DECISIONS, ARCHITECTURE).
- [x] T6 Review follow-up: deferred revoke uses the URL API captured at download time; vacuous global test replaced with a behavioral one.

## Routing

- T1–T5: delegated direct (one bounded writer). Trigger: writer trigger — 2+ non-trivial files.

## Delivery

- Single PR per sprint. Branch `feat/sprint-7-vercel-deploy` stacked on `feat/sprint-6-cash-control` (`eac2c68`; PR #6 still open). Retarget to `main` after PR #6 merges. Review base: `eac2c68`.

## Progress / Evidence

- Engram mirror `odd/sprint-7-vercel-deploy/tasks`: PENDING (host session registration failing in this session).

- T1 (delegated writer): RED `apps/api/src/index.test.ts` failed (no `src/index.ts`), GREEN 2/2. Layout: Vercel Root Directory `apps/api`, Express preset, entry `apps/api/src/index.ts` (default export of `createApp()`), `apps/api/vercel.json` (gru1, `functions["index.js"].maxDuration` 60, SPA rewrite), `pnpm run vercel-build` builds shared + web and copies `apps/web/dist` to `apps/api/public` (CDN). Local `npx vercel@latest build` (CLI 65.9.0, offline, hand-written `.vercel/project.json` in a scratch copy, no login/link) → `status: ok`; output: static `index.html` + `assets/`, one function `index.func` (runtime nodejs26.x, maxDuration 60, `packages/shared/dist`, pdfmake `vfs_fonts.js`, exceljs traced); materialized bundle answered `/api/health` 200. Found and fixed: Vercel's Node builder reads `apps/api/tsconfig.json` without `extends` and forces `strict: false` when `module` is missing → TS2345 in the build; `module`/`moduleResolution` now explicit. A `functions` key `src/index.ts` was silently ignored; `index.js` (the preset's function source) applies.

- T2 (delegated writer): RED 5 tests (shared limit + message 2, API 413 at 4 MB + 1 byte, web non-envelope 413 on upload and download 2, "hasta 4 MB" copy). GREEN: `MAX_UPLOAD_MEGABYTES`/`MAX_UPLOAD_BYTES`/`fileTooLargeMessage` in `@grido/shared` used by multer and the web client; shared 55, api 222, web 92 tests pass. Upload copy now "se procesa al momento y no se guarda" (it no longer runs on the owner's machine once deployed). D-47/D-48 added; 5 MB references in docs updated.

- T3 (delegated writer): RED 3 (delayed revoke with fake timers, selector locked while generating, error not carried to another view). GREEN: `REVOKE_DELAY_MS = 30_000` in `apps/web/src/lib/download.ts`; `useIsGeneratingReport()` (React Query `useIsMutating` on key `report-download`) disables the `ViewSelector`; `ReportDownloads` keyed by view id resets its mutation state per view. Tests stub `URL` with a fresh subclass per test (the real global is never mutated) and rely on the shared `restoreAllMocks`/`unstubAllGlobals` in `afterEach`. Web 96 tests pass. Safari/Firefox download behaviour still to be confirmed by the owner (acceptance 4).

- T4 (delegated writer): `apps/api/scripts/smoke.mjs` (inside `apps/api` so `exceljs` resolves from the API's dependencies; no new packages), root `pnpm smoke [baseUrl]`, optional `VERCEL_PROTECTION_BYPASS` → `x-vercel-protection-bypass`. No unit RED (a network script; exception): verified functionally. `PORT=3002 node apps/api/dist/server.js` + `pnpm smoke http://127.0.0.1:3002` → 5/5 ok, exit 0; against a closed port → 5 FAIL, exit 1; against the materialized Vercel function bundle from `vercel build` → 4/4 API checks ok (PDF 31 KB, xlsx 5 sheets), `GET /` 404 as expected (the CDN serves the page on Vercel).

- T5 (delegated writer): passive docs, structural readback + `pnpm format:check` (no RED applies). `docs/DEPLOYMENT.md` (layout, settings table, `vercel.json`, Vercel Authentication + Hobby/Pro note, first-deploy checklist, `pnpm smoke` incl. `VERCEL_PROTECTION_BYPASS`, source URLs), `docs/GUIA_DE_USO.md` (neutral Spanish), README links/status, ARCHITECTURE deployment section, DECISIONS D-49/D-50 (D-47/D-48 in T2), REQUIREMENTS NF-1/NF-2, PROJECT_OVERVIEW, DEVELOPMENT_WORKFLOW `pnpm smoke`.

## Pending on the owner's first real deploy

- Region `gru1` and max duration 60 s shown in the deployment's Functions tab.
- Install step with pnpm 11 (`ENABLE_EXPERIMENTAL_COREPACK=1` recommended), Node 26.
- CDN + rewrite routing, platform 413 above 4.5 MB, Vercel Authentication, `pnpm smoke https://<url>`.
- Downloads in Safari and Firefox (acceptance 4).

- Parent follow-up: `apps/api/public` (generated by `vercel-build`) added to ESLint `globalIgnores` and `.prettierignore`; verified `pnpm lint` and `pnpm format:check` pass with the folder present. DEPLOYMENT.md note updated.

- Native review (2026-11-02): medium (`executable_change` .gitignore), review_due slice_budget_reached (1023 lines over eac2c68..146f178). Consent granted. Lens review-reliability: approved, acknowledged, authority burned (lineage review-460295d3fe1daac2). Findings: R3-deferred-revoke-timer-leak (WARNING, `apps/web/src/lib/download.ts:20`), R3-vacuous-url-global-test (`download.test.ts:61-66`).
- T6 (inline, parent): RED `vitest run src/lib/download.test.ts` → 1 failed (deferred revoke hit the restored global). GREEN: web 96/96; `pnpm typecheck|lint|format:check|test|build` ok.

- Sprint 7 closed by the user on 2026-11-02. Upload copy "El archivo se procesa al momento y no se guarda." kept. Delivery: single push of `feat/sprint-7-vercel-deploy` (stacked on PR #6); PR opened by the user on GitHub.

## Status

Closed.

## Next step

- Owner merges PR #6 and #7, connects the repo in Vercel per `docs/DEPLOYMENT.md`, enables Vercel Authentication, then `pnpm smoke <url>` against the deployment; Safari/Firefox download check by the owner.
