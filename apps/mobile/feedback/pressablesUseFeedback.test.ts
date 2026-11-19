import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(__dirname, '..');
const skippedFolders = ['node_modules', '.expo', 'dist', 'coverage', 'ios', 'android'];

// The raw React Native controls that take a press. Every one of them must go through the kit's
// `FeedbackPressable`, so that every press gives its sound and haptic.
const rawPressableNames = [
  'Pressable',
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableWithoutFeedback',
  'TouchableNativeFeedback',
  'Switch',
  'Button',
];

// The files that may use one, with the reason.
const allowedFiles = new Map([
  ['components/ui/FeedbackPressable/FeedbackPressable.tsx', 'it is the feedback-aware pressable'],
  [
    'components/ui/TextField/TextField.tsx',
    'a press only puts the cursor in the field, and typing is silent',
  ],
]);

function sourceFilesIn(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory())
      return skippedFolders.includes(entry.name) ? [] : sourceFilesIn(fullPath);
    const isSource = /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name);
    return isSource ? [fullPath] : [];
  });
}

// What this scan does not catch: a pressable reached through a re-export or an alias of a module
// other than react-native, a `Pressable` created with `createElement`, a third party component that
// takes `onPress` (a native stack header button, for instance), `onPress` on a `View` or an
// `Animated` component, and `Linking` or gesture handler taps. Review has to keep those out.
function rawPressablesImportedBy(source: string): string[] {
  const imports = [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native'/g)];
  const named = imports
    .flatMap(([, names]) => (names ?? '').split(','))
    .map((name) => name.trim().split(/\s+as\s+/)[0] ?? '')
    .filter((name) => rawPressableNames.includes(name));

  // `import * as ReactNative from 'react-native'` or `import ReactNative from 'react-native'`, or
  // `require('react-native')`, followed by a use of a raw pressable through it.
  const reachesNamespace =
    /import\s+(?:\*\s+as\s+)?\w+\s+from\s*'react-native'|require\(\s*'react-native'\s*\)/.test(
      source,
    );
  const throughNamespace = reachesNamespace
    ? rawPressableNames.filter((name) =>
        new RegExp(`\\.${name}\\b|\\b${name}\\b\\s*[:,}]`).test(source),
      )
    : [];

  // A `Text` with an `onPress` is a pressable that has no feedback.
  const textWithOnPress = /<Text\b[^>]*\bonPress\b/.test(source) ? ['Text onPress'] : [];

  return [...named, ...throughNamespace, ...textWithOnPress];
}

describe('the pressable controls of the app', () => {
  const files = sourceFilesIn(appRoot).map((file) => ({
    relativePath: path.relative(appRoot, file).split(path.sep).join('/'),
    source: readFileSync(file, 'utf8'),
  }));

  it('should scan the kit and the screens', () => {
    const paths = files.map(({ relativePath }) => relativePath);

    expect(paths).toContain('components/ui/Button/Button.tsx');
    expect(paths).toContain('features/roundPlay/TurnView/TurnView.tsx');
  });

  it('should not use a raw React Native pressable outside the feedback-aware one', () => {
    const offenders = files
      .filter(({ relativePath }) => !allowedFiles.has(relativePath))
      .map(({ relativePath, source }) => ({
        relativePath,
        names: rawPressablesImportedBy(source),
      }))
      .filter(({ names }) => names.length > 0);

    expect(offenders).toEqual([]);
  });

  it.each([
    ["import { Pressable } from 'react-native';"],
    ["import { Pressable as Raw } from 'react-native';"],
    ["import * as ReactNative from 'react-native';\nconst Raw = ReactNative.Pressable;"],
    ["const { TouchableOpacity } = require('react-native');"],
    ["const Raw = require('react-native').Pressable;"],
    ['const view = <Text onPress={go}>Go</Text>;'],
    ['const view = <Text\n  accessibilityRole="link"\n  onPress={go}\n>Go</Text>;'],
  ])('should find a raw pressable in: %s', (source) => {
    expect(rawPressablesImportedBy(source)).not.toHaveLength(0);
  });

  it.each([
    ["import { Text, View } from 'react-native';\nconst view = <Text>Go</Text>;"],
    ["import { FeedbackPressable } from '../FeedbackPressable';"],
  ])('should find nothing in: %s', (source) => {
    expect(rawPressablesImportedBy(source)).toEqual([]);
  });

  it('should only list allowed files that still use a raw pressable', () => {
    const stale = [...allowedFiles.keys()].filter((allowedPath) => {
      const file = files.find(({ relativePath }) => relativePath === allowedPath);
      return !file || rawPressablesImportedBy(file.source).length === 0;
    });

    expect(stale).toEqual([]);
  });

  it('should give the shared pressable every press, by importing the feedback module', () => {
    const shared = files.find(
      ({ relativePath }) =>
        relativePath === 'components/ui/FeedbackPressable/FeedbackPressable.tsx',
    );

    expect(shared?.source).toContain("from '../../../feedback/FeedbackProvider'");
  });
});
