import { z } from 'zod';

const envSchema = z.object({
  // 127.0.0.1 keeps the app private to this machine. Only override it deliberately.
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // An empty value (e.g. `WEB_DIST_DIR=`) means "not set", not "the current directory".
  WEB_DIST_DIR: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export interface Config {
  host: string;
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  /** Override for the web build directory; undefined means use the default location. */
  webDistDir: string | undefined;
}

/** Validates the process environment. Throws on invalid values so the server fails fast. */
export function parseConfig(env: Record<string, string | undefined>): Config {
  const parsed = envSchema.parse(env);
  return {
    host: parsed.HOST,
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    webDistDir: parsed.WEB_DIST_DIR,
  };
}
