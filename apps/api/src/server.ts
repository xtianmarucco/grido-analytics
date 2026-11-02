import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseConfig } from './config.js';
import { createApp } from './http/app.js';

const config = parseConfig(process.env);

// Both `src/server.ts` (dev) and `dist/server.js` (prod) sit two levels below `apps/`.
const defaultWebDistDir = fileURLToPath(new URL('../../web/dist', import.meta.url));
const webDistDir = path.resolve(config.webDistDir ?? defaultWebDistDir);
// Production mode = a web build exists (`pnpm start` always builds first). No env var needed,
// so it works the same on Windows and macOS.
const servesWeb = existsSync(path.join(webDistDir, 'index.html'));

const app = createApp({ webDistDir: servesWeb ? webDistDir : undefined });

const server = app.listen(config.port, config.host, (error?: Error) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  const url = `http://${config.host}:${config.port}`;
  console.log(`Grido Analytics API listening on ${url}`);
  console.log(servesWeb ? `Serving web app from ${webDistDir}` : 'Web build not found: API only');
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}, shutting down`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
