const workletsResolver = require('react-native-worklets/jest/resolver');

// The worklets resolver drops the `.native` file extensions, which makes Reanimated load its plain
// JavaScript implementation, because the native module does not exist under Jest. It decides by
// looking for the package name in the directory path. Under pnpm that name also appears in the
// directory of every package that lists the worklets as a peer, such as expo-sqlite, and dropping
// `.native` there loads the wrong files. So it is only used for the two packages that need it.
const insideWorkletsOrReanimated =
  /[\\/]node_modules[\\/]react-native-(worklets|reanimated)([\\/]|$)/;

module.exports = (request, options) => {
  const needsPlainJavaScript =
    request.includes('react-native-worklets') || insideWorkletsOrReanimated.test(options.basedir);
  return needsPlainJavaScript
    ? workletsResolver(request, options)
    : options.defaultResolver(request, options);
};
