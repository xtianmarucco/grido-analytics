// @ts-check
// ESLint 10 resolves the nearest config file per linted file, so this config applies to
// everything under apps/web. It extends the root config and adds browser + React rules.
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

import rootConfig from '../../eslint.config.js';

export default defineConfig(
  rootConfig,
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['vite.config.ts'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    // shadcn/ui files export variant helpers next to components by design.
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
);
