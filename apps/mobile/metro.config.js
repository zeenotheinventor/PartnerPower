const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// The Expo default config with a debug id added to every bundle and source map, so the stack in an
// error report from a build or an update maps back to the source.
module.exports = withNativeWind(getSentryExpoConfig(__dirname), { input: './global.css' });
