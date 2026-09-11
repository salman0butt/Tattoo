import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', 'eslint.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'packages/core/src/index.test.ts',
            'packages/config/src/index.test.ts',
            'packages/cli/src/index.test.ts',
            'packages/claude-code/src/index.test.ts',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
