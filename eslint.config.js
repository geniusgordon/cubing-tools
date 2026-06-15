import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // `react-hooks/set-state-in-effect` (new in eslint-plugin-react-hooks v7)
      // flags any synchronous setState in an effect. Several effects here are
      // intentional, behavior-preserving ports: generating a scramble/case on
      // mount, resetting CubeImage loading state when the alg changes, and
      // keeping the latest solve selected as history changes. These are correct
      // for this app, so we keep the rule on as a non-blocking warning rather
      // than disabling it or littering the code with eslint-disable comments.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // shadcn-generated primitives commonly export helper values/hooks alongside
    // their components (e.g. buttonVariants, useSidebar). This trips the
    // fast-refresh-only rule, which adds no value for these third-party files.
    files: ['src/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  eslintConfigPrettier,
])
