# Development workflow

## Quick path

1. `nvm use` (Node 26) and `corepack enable` (pnpm 11.17).
2. `pnpm install`
3. `pnpm dev` → open `http://127.0.0.1:5173`. You should see "Conectado al servidor".

## Scripts (root)

| Script              | Does                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`          | API (`tsx watch`, :3001) and web (Vite, :5173) in parallel               |
| `pnpm start`        | Build everything, then run the compiled API serving the web app on :3001 |
| `pnpm build`        | Build shared → api → web                                                 |
| `pnpm test`         | Vitest in every package                                                  |
| `pnpm typecheck`    | `tsc --noEmit` in every package                                          |
| `pnpm lint`         | ESLint (flat config; `apps/web` adds React rules)                        |
| `pnpm format:check` | Prettier check (`pnpm format` to fix)                                    |

## Before committing

- [ ] `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
- [ ] No real Excel files or employee names staged.
- [ ] Conventional Commit message (`feat(api): …`, `fix(web): …`, `docs: …`).

## Conventions

- Test-first for behavior: write the failing test, make it pass, refactor.
- API tests: supertest against `createApp()` (no listening socket).
- Web tests: Testing Library + jsdom; stub `fetch`, not modules.
- `@grido/shared` is consumed from source in dev/tests (tsconfig `paths`, Vite alias) and from
  `dist` in the compiled API.
- Branch per sprint (`feat/sprint-N-…`); work-unit commits; PRs opened by the owner.

## Environment

Copy `.env.example` to `.env` only if you need to change `HOST`, `PORT`, or `WEB_DIST_DIR`. The
defaults work without a `.env` (the API reads `process.env`; export variables in your shell).
