import { colorThemes } from '@getfreak/tokens';

import { z } from 'zod';

import appConfig from './app.json';

// The few colours that must sit in app.json are an exception to "no raw colour values outside the
// token package". Native code reads them before any JavaScript runs, so this test keeps them equal
// to the tokens they stand for.
const splashOptionsSchema = z.object({
  backgroundColor: z.string(),
  dark: z.object({ backgroundColor: z.string() }),
});

const splashOptions = splashOptionsSchema.parse(
  appConfig.expo.plugins.flatMap((plugin) =>
    Array.isArray(plugin) && plugin[0] === 'expo-splash-screen' ? [plugin[1]] : [],
  )[0],
);

function collectColorValues(value: unknown): string[] {
  if (typeof value === 'string') return /^#[0-9a-f]{3,8}$/i.test(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectColorValues);
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(collectColorValues);
  }
  return [];
}

function collectThemeColors(value: unknown): string[] {
  if (typeof value === 'string') return [value.toUpperCase()];
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(collectThemeColors);
  }
  return [];
}

describe('app.json colours', () => {
  it('should colour the light splash screen with the light background token', () => {
    expect(splashOptions.backgroundColor).toBe(colorThemes.light.background);
  });

  it('should colour the dark splash screen with the dark background token', () => {
    expect(splashOptions.dark.backgroundColor).toBe(colorThemes.dark.background);
  });

  it('should colour the Android adaptive icon with the dark background token', () => {
    expect(appConfig.expo.android.adaptiveIcon.backgroundColor).toBe(colorThemes.dark.background);
  });

  it('should hold no colour that is not a token', () => {
    const tokenColors = collectThemeColors(colorThemes);

    const strayColors = collectColorValues(appConfig).filter(
      (color) => !tokenColors.includes(color.toUpperCase()),
    );

    expect(strayColors).toEqual([]);
  });

  it('should find the colours it guards, so the check is not empty', () => {
    expect(collectColorValues(appConfig)).toHaveLength(3);
  });
});

describe('app.json updates', () => {
  // With the app version policy, a native change without a version bump would send JavaScript to
  // phones whose native code does not match it, and they would crash. The fingerprint policy
  // follows the native code on its own, so a revert to another policy must fail here.
  it('should follow the native fingerprint for the runtime version', () => {
    expect(appConfig.expo.runtimeVersion.policy).toBe('fingerprint');
  });
});
