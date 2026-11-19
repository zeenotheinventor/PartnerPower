import { colorThemes } from '@getfreak/tokens';

import { z } from 'zod';

import appConfig from './app.json';
import easConfig from './eas.json';

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

describe('app.json native settings', () => {
  it('should not offer an iPad build', () => {
    expect(appConfig.expo.ios.supportsTablet).toBe(false);
  });

  it('should declare that the app uses non-exempt encryption, since the database is encrypted', () => {
    expect(appConfig.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(true);
  });

  it('should keep app data out of Android backups', () => {
    expect(appConfig.expo.android.allowBackup).toBe(false);
  });

  it('should declare every required reason API with its exact reasons', () => {
    expect(appConfig.expo.ios.privacyManifests.NSPrivacyAccessedAPITypes).toEqual([
      {
        NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
        NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
      },
      {
        NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
        NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
      },
      {
        NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
        NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
      },
      {
        NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
        NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
      },
    ]);
  });

  // The lock, reminder and vibration tickets add libraries that declare these. A blocked entry
  // would strip them from the merged manifest, so the lock or the reminder would silently fail.
  it.each([
    'android.permission.INTERNET',
    'android.permission.VIBRATE',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.USE_BIOMETRIC',
    'android.permission.USE_FINGERPRINT',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.MODIFY_AUDIO_SETTINGS',
  ])('should not block %s', (permission) => {
    expect(appConfig.expo.android.blockedPermissions).not.toContain(permission);
  });

  it('should block the permissions the app never uses', () => {
    expect(appConfig.expo.android.blockedPermissions).toEqual(
      expect.arrayContaining([
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ]),
    );
  });
});

describe('eas.json production profile', () => {
  const production = easConfig.build.production;

  it('should build from the shared base profile', () => {
    expect(production.extends).toBe('base');
  });

  it('should make an Android app bundle for the Play Store', () => {
    expect(production.android.buildType).toBe('app-bundle');
  });

  it('should use store distribution', () => {
    expect(production.distribution).toBe('store');
  });

  it('should raise the build number on every build', () => {
    expect(production.autoIncrement).toBe(true);
  });

  it('should listen to the production update channel', () => {
    expect(production.channel).toBe('production');
  });

  it('should not be a development client', () => {
    expect(production).not.toHaveProperty('developmentClient');
  });

  it('should name the store key files by path, without holding a key', () => {
    expect(easConfig.submit.production).toEqual({
      ios: { ascApiKeyPath: expect.stringMatching(/^\.\/secrets\/.+\.p8$/) },
      android: { serviceAccountKeyPath: expect.stringMatching(/^\.\/secrets\/.+\.json$/) },
    });
  });
});
