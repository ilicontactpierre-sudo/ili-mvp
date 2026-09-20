import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Fichiers serveur : ils tournent dans Node, pas dans le navigateur.
    // On leur donne les variables propres à Node (process, Buffer, etc.).
    files: ['api/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        // Le projet est en mode module (ESM) : require, module, exports,
        // __dirname et __filename n'y existent pas. On les laisse signalés
        // volontairement, car les utiliser dans ces fichiers fait planter le script.
        require: 'off',
        module: 'off',
        exports: 'off',
        __dirname: 'off',
        __filename: 'off',
      },
    },
  },
])
