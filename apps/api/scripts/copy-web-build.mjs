// Copies the web build (`apps/web/dist`) into `apps/api/public`, where Vercel's Express preset
// serves static files from its CDN. Only used by `pnpm vercel-build`; local `pnpm start` serves
// `apps/web/dist` directly. `public/` is a build artifact (git-ignored).
import { cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../web/dist', import.meta.url));
const target = fileURLToPath(new URL('../public', import.meta.url));

if (!existsSync(`${source}/index.html`)) {
  console.error(`Web build not found at ${source}. Build @grido/web first.`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`Copied web build to ${target}`);
