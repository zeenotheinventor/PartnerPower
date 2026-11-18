import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import rawColorPattern from './tools/rawColorPattern.json' with { type: 'json' };

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

// A colour is written once, in packages/tokens. The pattern finds a hex value or a colour function
// such as rgb() or oklch() in a string, so it also catches an arbitrary Tailwind value such as
// bg-[...]. Named colours are not covered. The same pattern file feeds the style sheet test.
const rawColorMessage =
  'Raw colour values live in packages/tokens only. Use a colour utility such as bg-background.';

const rawColorSelectors = ['Literal[value=', 'TemplateElement[value.raw='].map((start) => ({
  selector: `${start}/${rawColorPattern.source}/${rawColorPattern.flags}]`,
  message: rawColorMessage,
}));

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
    files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    ignores: ['packages/tokens/**'],
    rules: { 'no-restricted-syntax': ['error', ...rawColorSelectors] },
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
          '**/tokens',
          '**/tokens/**',
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
          '**/tokens',
          '**/tokens/**',
          '**/mobile',
          '**/mobile/**',
        ],
      },
    ]),
  },
  {
    files: ['packages/tokens/**/*.{ts,tsx,js}'],
    rules: restrictImports([
      { group: frameworkModules },
      {
        group: [
          '@getfreak/*',
          '**/apps/**',
          '**/packages/**',
          '**/core',
          '**/core/**',
          '**/content',
          '**/content/**',
          '**/mobile',
          '**/mobile/**',
        ],
      },
    ]),
  },
);
