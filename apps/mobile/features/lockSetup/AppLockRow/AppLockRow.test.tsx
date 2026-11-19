import { copy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { Platform } from 'react-native';

import { LockServiceContext, type LockService } from '../../../lock';
import { createTestLock, type TestLockSetup } from '../../../lock/testing/createTestLock';
import { renderThemed } from '../../../tailwind/renderThemed';
import { AppLockRow } from './AppLockRow';

const mockPush = jest.fn();
// Settings is in focus when it comes back into view. The test calls the latest effect to say so.
let mockRunFocusEffect: () => void = () => {};
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (effect: () => void) => {
      mockRunFocusEffect = effect;
      useEffect(effect, [effect]);
    },
  };
});

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

async function renderRow({
  isLockOn = false,
  isBiometricsOn = false,
  lockSetup,
}: { isLockOn?: boolean; isBiometricsOn?: boolean; lockSetup?: TestLockSetup } = {}) {
  const { lock } = createTestLock(lockSetup);
  if (isLockOn) await lock.setPin('4821');
  if (isBiometricsOn) await lock.setBiometricsChoice(true);
  await renderRowWith(lock);
  return lock;
}

async function renderRowWith(lock: LockService) {
  await renderThemed(
    <LockServiceContext.Provider value={lock}>
      <AppLockRow />
    </LockServiceContext.Provider>,
  );
  await act(async () => {});
}

describe('AppLockRow', () => {
  beforeEach(() => {
    mockPush.mockClear();
    setPlatform('ios');
  });

  it('should say Off when the lock is off', async () => {
    await renderRow();

    expect(
      screen.getByRole('button', { name: `${copy.settings.lockLabel}, ${copy.settings.lockOff}` }),
    ).toBeOnTheScreen();
  });

  it('should say On, PIN when the lock is on without biometrics', async () => {
    await renderRow({ isLockOn: true });

    expect(
      screen.getByRole('button', {
        name: `${copy.settings.lockLabel}, ${copy.settings.lockOnPin}`,
      }),
    ).toBeOnTheScreen();
  });

  it.each([
    ['face', 'ios', copy.biometrics.kinds.faceId.rowValue],
    ['fingerprint', 'ios', copy.biometrics.kinds.touchId.rowValue],
    ['fingerprint', 'android', copy.biometrics.kinds.fingerprint.rowValue],
    ['face', 'android', copy.biometrics.kinds.faceUnlock.rowValue],
  ] as const)(
    'should name the kind when biometrics are on, for %s on %s',
    async (kind, os, rowValue) => {
      setPlatform(os);
      await renderRow({ isLockOn: true, isBiometricsOn: true, lockSetup: { kinds: [kind] } });

      expect(
        screen.getByRole('button', { name: `${copy.settings.lockLabel}, ${rowValue}` }),
      ).toBeOnTheScreen();
    },
  );

  it('should say On, PIN when biometrics were chosen but the phone has none set up now', async () => {
    await renderRow({
      isLockOn: true,
      isBiometricsOn: true,
      lockSetup: { isEnrolled: false },
    });

    expect(
      screen.getByRole('button', {
        name: `${copy.settings.lockLabel}, ${copy.settings.lockOnPin}`,
      }),
    ).toBeOnTheScreen();
  });

  it('should show no value when the lock cannot be read', async () => {
    const { lock } = createTestLock();
    jest.spyOn(lock, 'isLockOn').mockRejectedValue(new Error('Storage is out of reach'));

    await renderRowWith(lock);

    expect(screen.getByRole('button', { name: copy.settings.lockLabel })).toBeOnTheScreen();
  });

  it('should read the lock again when Settings comes back into view', async () => {
    const lock = await renderRow();
    expect(screen.getByRole('button', { name: /Off$/ })).toBeOnTheScreen();

    await lock.setPin('4821');
    await act(async () => mockRunFocusEffect());

    expect(screen.getByRole('button', { name: /On, PIN$/ })).toBeOnTheScreen();
  });

  it('should open the App lock screen', async () => {
    await renderRow();

    fireEvent.press(screen.getByRole('button', { name: /^App lock/ }));

    expect(mockPush).toHaveBeenCalledWith('/app-lock');
  });
});
