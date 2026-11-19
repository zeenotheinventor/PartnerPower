import * as SplashScreen from 'expo-splash-screen';

/** Hides the splash screen. If the first try is refused it tries once more, so it is never left up. */
export async function hideSplashScreen() {
  try {
    await SplashScreen.hideAsync();
  } catch {
    await SplashScreen.hideAsync().catch(() => {});
  }
}
