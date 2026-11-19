import { copy, fillCopy } from '@getfreak/content';
import { nativeApplicationVersion, nativeBuildVersion } from 'expo-application';

/**
 * The line at the foot of Settings. The version and the build are the ones the phone holds for the
 * installed app, so they match what the store shows. An update delivered over the air does not
 * change them. Under Jest the native module answers with a stand-in.
 */
export function getAppVersionLabel(): string | null {
  if (!nativeApplicationVersion) return null;
  if (!nativeBuildVersion) {
    return fillCopy(copy.settings.versionWithoutBuild, { version: nativeApplicationVersion });
  }
  return fillCopy(copy.settings.version, {
    version: nativeApplicationVersion,
    build: nativeBuildVersion,
  });
}
