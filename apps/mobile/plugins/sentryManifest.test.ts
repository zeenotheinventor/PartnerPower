type MetaData = { $: { 'android:name': string; 'android:value': string } };
type Manifest = { manifest: { application?: { 'meta-data'?: MetaData[] }[] } };

const { withQuietBreadcrumbsInManifest } = jest.requireActual<{
  withQuietBreadcrumbsInManifest: (manifest: Manifest) => Manifest;
}>('./sentryManifest');

const tapBreadcrumbs = 'io.sentry.breadcrumbs.user-interaction';

function metaDataOf(manifest: Manifest) {
  return manifest.manifest.application?.[0]?.['meta-data'];
}

describe('withQuietBreadcrumbsInManifest', () => {
  it('should turn the native tap breadcrumbs off', () => {
    const manifest = withQuietBreadcrumbsInManifest({ manifest: { application: [{}] } });

    expect(metaDataOf(manifest)).toEqual([
      { $: { 'android:name': tapBreadcrumbs, 'android:value': 'false' } },
    ]);
  });

  it('should keep the other settings of the application', () => {
    const other = {
      $: { 'android:name': 'expo.modules.updates.ENABLED', 'android:value': 'true' },
    };

    const manifest = withQuietBreadcrumbsInManifest({
      manifest: { application: [{ 'meta-data': [other] }] },
    });

    expect(metaDataOf(manifest)).toEqual([
      other,
      { $: { 'android:name': tapBreadcrumbs, 'android:value': 'false' } },
    ]);
  });

  it('should replace a setting that turns them on, and not add a second one', () => {
    const turnedOn = { $: { 'android:name': tapBreadcrumbs, 'android:value': 'true' } };

    const manifest = withQuietBreadcrumbsInManifest({
      manifest: { application: [{ 'meta-data': [turnedOn] }] },
    });

    expect(metaDataOf(manifest)).toEqual([
      { $: { 'android:name': tapBreadcrumbs, 'android:value': 'false' } },
    ]);
  });

  it('should leave a manifest with no application as it is', () => {
    expect(withQuietBreadcrumbsInManifest({ manifest: {} })).toEqual({ manifest: {} });
  });
});
