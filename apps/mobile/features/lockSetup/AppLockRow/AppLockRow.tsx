import { copy } from '@getfreak/content';
import { useFocusEffect, useRouter } from 'expo-router';
import { Platform } from 'react-native';

import { SettingsRow } from '../../../components/ui';
import { biometricsCopyKind } from '../biometricsCopyKind';
import { useLockOverview, type LockOverview } from '../useLockOverview';

export const appLockRoute = '/app-lock';

function valueOf(overview: LockOverview | undefined): string | undefined {
  if (!overview) return undefined;
  if (!overview.isLockOn) return copy.settings.lockOff;
  if (!overview.isBiometricsOn || !overview.availability.isAvailable)
    return copy.settings.lockOnPin;
  return copy.biometrics.kinds[biometricsCopyKind(overview.availability, Platform.OS)].rowValue;
}

/**
 * The App lock row of Settings. It says off, on with a PIN, or on with a PIN and the kind of
 * biometrics, and it reads the lock again each time Settings comes back into view, so it is right
 * after the lock screens close. It shows no value until the first read, or if the read fails.
 */
export function AppLockRow() {
  const router = useRouter();
  const { overview, reload } = useLockOverview();

  useFocusEffect(reload);

  return (
    <SettingsRow
      label={copy.settings.lockLabel}
      value={valueOf(overview)}
      onPress={() => router.push(appLockRoute)}
    />
  );
}
