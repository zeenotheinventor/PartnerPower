import { copy } from '@getfreak/content';
import { useEffect, useState } from 'react';

import { Toast } from '../../components/ui';
import { storage as defaultStorage } from '../../storage';
import { announceUpdateOnce } from '../announceUpdateOnce';
import { nativeUpdatesDevice } from '../nativeUpdatesDevice';
import type { UpdateToastHostProps } from './types';

/**
 * Tells the player once, at launch, that the app has updated. It sits at the root, over every
 * screen, and shows nothing at all unless this launch is the first on a new update. The update is
 * downloaded in the background and only starts running on a later launch, so nothing here reloads
 * the app.
 */
export function UpdateToastHost({
  device = nativeUpdatesDevice,
  storage = defaultStorage,
}: UpdateToastHostProps) {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    announceUpdateOnce(device, storage).then((shouldAnnounce) => {
      if (isCurrent && shouldAnnounce) setIsShowing(true);
    });
    return () => {
      isCurrent = false;
    };
  }, [device, storage]);

  if (!isShowing) return null;

  return (
    <Toast
      message={copy.updateToast.message}
      dismissHint={copy.updateToast.dismissHint}
      onDismiss={() => setIsShowing(false)}
    />
  );
}
