import { copy } from '@getfreak/content';
import { useEffect } from 'react';

import { Header, Screen } from '../../../components/ui';
import { useGoBack } from '../../settings/useGoBack';
import { LockOnSettings } from '../LockOnSettings';
import { TurnOnFlow } from '../TurnOnFlow';
import { useLockOverview } from '../useLockOverview';

const settingsRoute = '/settings';

/**
 * The App lock screen. With the lock off it is the flow that turns it on, and with it on it is the
 * lock's settings. It reads the lock once when it opens. Until then, and if the read fails, it
 * shows only its header, so the player can still go back.
 */
export function AppLockScreen() {
  const goBack = useGoBack(settingsRoute);
  const { overview, reload } = useLockOverview();

  useEffect(reload, [reload]);

  if (!overview) {
    return (
      <Screen>
        <Header title={copy.lockSetup.title} backLabel={copy.lockSetup.backLabel} onBack={goBack} />
      </Screen>
    );
  }

  return overview.isLockOn ? (
    <LockOnSettings
      availability={overview.availability}
      isBiometricsOn={overview.isBiometricsOn}
      onExit={goBack}
    />
  ) : (
    <TurnOnFlow availability={overview.availability} onExit={goBack} />
  );
}
