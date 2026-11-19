import { copy } from '@getfreak/content';
import { act, screen } from 'nativewind/test';
import { AccessibilityInfo } from 'react-native';

import { renderThemed } from '../../tailwind/renderThemed';
import { createInMemoryBackend } from '../../storage/createInMemoryBackend';
import { createStorage } from '../../storage/createStorage';
import type { LaunchedUpdate, UpdatesDevice } from '../types';
import { UpdateToastHost } from './UpdateToastHost';

function deviceLaunching(launchedUpdate: LaunchedUpdate | undefined): UpdatesDevice {
  return { getLaunchedUpdate: () => launchedUpdate };
}

const toastName = { name: copy.updateToast.message };

async function renderHost(device: UpdatesDevice, backend = createInMemoryBackend()) {
  const rendered = await renderThemed(
    <UpdateToastHost device={device} storage={createStorage(backend)} />,
  );
  await act(async () => {});
  return { rendered, backend };
}

describe('UpdateToastHost', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should show the toast after an update', async () => {
    await renderHost(deviceLaunching({ isEmbeddedLaunch: false, updateId: 'update-1' }));

    expect(screen.getByRole('button', toastName)).toBeOnTheScreen();
  });

  it('should show nothing when the app launched from the installed build', async () => {
    await renderHost(deviceLaunching({ isEmbeddedLaunch: true, updateId: null }));

    expect(screen.queryByRole('button', toastName)).not.toBeOnTheScreen();
  });

  it('should show nothing the second time the same update launches', async () => {
    const backend = createInMemoryBackend();
    const device = deviceLaunching({ isEmbeddedLaunch: false, updateId: 'update-1' });
    const first = await renderHost(device, backend);
    first.rendered.unmount();

    await renderHost(device, backend);

    expect(screen.queryByRole('button', toastName)).not.toBeOnTheScreen();
  });

  it('should show nothing when updates are not available', async () => {
    await renderHost(deviceLaunching(undefined));

    expect(screen.queryByRole('button', toastName)).not.toBeOnTheScreen();
  });

  it('should take the toast away when its time is up', async () => {
    jest.useFakeTimers();
    try {
      await renderHost(deviceLaunching({ isEmbeddedLaunch: false, updateId: 'update-1' }));

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.queryByRole('button', toastName)).not.toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});
