import { describe, expect, it } from 'vitest';

import { parseConfig } from './config.js';

describe('parseConfig', () => {
  it('defaults to 127.0.0.1:3001 in development', () => {
    expect(parseConfig({})).toEqual({ host: '127.0.0.1', port: 3001, nodeEnv: 'development' });
  });

  it('reads HOST, PORT and NODE_ENV from the environment', () => {
    expect(parseConfig({ HOST: '0.0.0.0', PORT: '4000', NODE_ENV: 'production' })).toEqual({
      host: '0.0.0.0',
      port: 4000,
      nodeEnv: 'production',
    });
  });

  it('rejects a port that is not a valid TCP port', () => {
    expect(() => parseConfig({ PORT: 'abc' })).toThrow();
    expect(() => parseConfig({ PORT: '70000' })).toThrow();
  });
});
