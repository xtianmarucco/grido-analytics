import { parseConfig } from './config.js';
import { createApp } from './http/app.js';

const config = parseConfig(process.env);
const app = createApp();

const server = app.listen(config.port, config.host, (error?: Error) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Grido Analytics API listening on http://${config.host}:${config.port}`);
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
