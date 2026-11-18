const jestExpoPreset = require('jest-expo/jest-preset');

// The preset ignores everything in node_modules that it does not list. nativewind is added to
// that list because its test helper ships untranspiled JSX.
const listedModules = 'standard-navigation))';
const [ignoreNodeModules, ...otherPatterns] = jestExpoPreset.transformIgnorePatterns;
const withNativewind = ignoreNodeModules.replace(listedModules, `standard-navigation|nativewind))`);

if (withNativewind === ignoreNodeModules) {
  throw new Error(
    'jest.config.js could not add nativewind to the transformIgnorePatterns of jest-expo. ' +
      'The preset has changed, so update the pattern this file edits.',
  );
}

// The first test in a file that renders does work no later test repeats: React Native loads its
// components on first use (about 1.2 s), NativeWind compiles the Tailwind config on the first
// themed render (about 1 s), and the route tree tests load every screen on the first launch
// (about 2.2 s). On an idle machine the slowest first test takes about 2.5 s. On a loaded one,
// such as a small CI runner, a cold cache, or a run straight after `expo export`, the same work
// takes several times as long, and it went past Jest's default of 5 s. These tests wait on
// nothing but that work, so 30 s only has to be long enough for it. A test that really hangs
// still fails, 25 s later than before.
const testTimeoutMilliseconds = 30_000;

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testTimeout: testTimeoutMilliseconds,
  transformIgnorePatterns: [withNativewind, ...otherPatterns],
};
