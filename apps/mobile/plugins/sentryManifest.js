// Turns off the breadcrumbs the native Android SDK records from taps. They are attached only to
// reports the native side sends by itself, which never pass through the app's own scrubbing, and
// they hold the class and id of the view that was pressed.
const quietBreadcrumbs = { 'io.sentry.breadcrumbs.user-interaction': 'false' };

/** Adds the settings to the application of an Android manifest, replacing any already there. */
function withQuietBreadcrumbsInManifest(manifest) {
  const application = manifest.manifest.application?.[0];
  if (application === undefined) return manifest;

  const names = Object.keys(quietBreadcrumbs);
  const others = (application['meta-data'] ?? []).filter(
    (entry) => !names.includes(entry.$['android:name']),
  );
  application['meta-data'] = [
    ...others,
    ...names.map((name) => ({
      $: { 'android:name': name, 'android:value': quietBreadcrumbs[name] },
    })),
  ];
  return manifest;
}

module.exports = { quietBreadcrumbs, withQuietBreadcrumbsInManifest };
