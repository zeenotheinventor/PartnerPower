import { Redirect } from 'expo-router';

type KitGalleryModule = typeof import('../../features/dev/KitGallery');

// Expo Router bundles every file under app/, so this route file always exists. The gallery itself
// is required inside the development branch, which Metro drops from a production bundle, and a
// production build that reaches this route is sent back to the first screen.
export default function KitRoute() {
  if (__DEV__) {
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const { KitGallery }: KitGalleryModule = require('../../features/dev/KitGallery');
    return <KitGallery />;
  }

  return <Redirect href="/" />;
}
