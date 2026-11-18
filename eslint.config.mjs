import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const frameworkModules = [
  'react',
  'react/*',
  'react-dom',
  'react-dom/*',
  'react-native',
  'react-native/*',
  'expo',
  'expo/*',
  'expo-*',
  'expo-*/*',
  '@expo/*',
  '@react-native/*',
];

const workspaceBoundaryMessage = 'See the import rules in docs/architecture.md.';

function restrictImports(patterns) {
  return {
    'no-restricted-imports': [
      'error',
      { patterns: patterns.map((group) => ({ ...group, message: workspaceBoundaryMessage })) },
    ],
  };
}

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/.expo/**', '**/coverage/**', '**/dist/**'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ['packages/core/**/*.{ts,tsx,js}'],
    rules: restrictImports([
      { group: frameworkModules },
      {
        group: [
          '@getfreak/*',
          '**/apps/**',
          '**/packages/**',
          '**/content',
          '**/content/**',
          '**/mobile',
          '**/mobile/**',
        ],
      },
    ]),
  },
  {
    files: ['packages/content/**/*.{ts,tsx,js}'],
    rules: restrictImports([
      { group: frameworkModules },
      {
        group: [
          '@getfreak/*',
          '!@getfreak/core',
          '**/apps/**',
          '**/packages/**',
          '**/mobile',
          '**/mobile/**',
        ],
      },
    ]),
  },
);
