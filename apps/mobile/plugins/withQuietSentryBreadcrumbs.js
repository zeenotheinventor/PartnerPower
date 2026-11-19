const { withAndroidManifest } = require('expo/config-plugins');

const { withQuietBreadcrumbsInManifest } = require('./sentryManifest');

/** An Expo config plugin. See sentryManifest.js for what it changes and why. */
module.exports = function withQuietSentryBreadcrumbs(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    manifestConfig.modResults = withQuietBreadcrumbsInManifest(manifestConfig.modResults);
    return manifestConfig;
  });
};
