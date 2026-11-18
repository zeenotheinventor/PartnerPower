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

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [withNativewind, ...otherPatterns],
};
