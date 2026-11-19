import { copy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { fireEvent, screen } from 'nativewind/test';
import { useState, type ReactElement } from 'react';
import { AccessibilityInfo, BackHandler, Modal, Platform, Text } from 'react-native';

import { FeedbackPressable } from '../../../components/ui';
import { LockServiceContext, type LockService } from '../../../lock';
import { createTestLock, type TestLockSetup } from '../../../lock/testing/createTestLock';
import { changeAppState, fakeAppState } from '../../../lock/testing/fakeAppState';
import { renderThemed } from '../../../tailwind/renderThemed';
import { whileBiometricsPromptIsOpen } from '../../lockSetup/useClearOnBackground';
import { LockGate } from './LockGate';

const mockClearEverything = jest.fn();
jest.mock('../../../storage/useClearEverything', () => ({
  useClearEverything: () => mockClearEverything,
}));

const rightPin = '4821';
const appContent = 'App content';

// Something with state of its own, to see that the app is not remounted by a lock.
function CountingApp() {
  const [count, setCount] = useState(0);
  return (
    <>
      <Text>{`${appContent} ${count}`}</Text>
      <FeedbackPressable
        accessibilityRole="button"
        accessibilityLabel="Add one"
        onPress={() => setCount((previous) => previous + 1)}
      >
        <Text>Add</Text>
      </FeedbackPressable>
    </>
  );
}

type GateSetup = TestLockSetup & { isLockOn?: boolean; isBiometricsOn?: boolean };

async function renderGate(setup: GateSetup = {}) {
  const test = createTestLock(setup);
  if (setup.isLockOn ?? true) await test.lock.setPin(rightPin);
  if (setup.isBiometricsOn) await test.lock.setBiometricsChoice(true);
  await mountGate(test.lock);
  return test;
}

function gateElement(lock: LockService, app: ReactElement = <CountingApp />) {
  return (
    <LockServiceContext.Provider value={lock}>
      <LockGate>{app}</LockGate>
    </LockServiceContext.Provider>
  );
}

async function mountGate(lock: LockService) {
  await renderThemed(gateElement(lock));
  await act(async () => {});
}

async function advance(milliseconds: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

async function unlockWithPin() {
  [...rightPin].forEach((number) => fireEvent.press(screen.getByRole('button', { name: number })));
  await advance(200);
}

/** The app goes to the background, stays away, and comes back. */
async function awayFor(milliseconds: number) {
  await changeAppState('background');
  await advance(milliseconds);
  await changeAppState('active');
  await advance(1);
}

const lockHeading = () => screen.queryByRole('header', { name: copy.lock.title });
const appIsReachable = () => screen.queryByText(new RegExp(appContent)) !== null;
const coverIsShown = () => screen.queryAllByTestId('privacy-cover').length > 0;

describe('LockGate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fakeAppState();
    mockClearEverything.mockReset();
    jest.mocked(preventScreenCaptureAsync).mockClear();
    jest.mocked(allowScreenCaptureAsync).mockClear();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('on a cold start', () => {
    it('should show no screen of the app before it knows whether the lock is on', async () => {
      const { lock } = createTestLock();
      await lock.setPin(rightPin);

      await renderThemed(gateElement(lock));

      expect(
        screen.queryByText(new RegExp(appContent), { includeHiddenElements: true }),
      ).toBeNull();
      expect(coverIsShown()).toBe(true);
    });

    it('should show the lock screen, and nothing of the app, when the lock is on', async () => {
      await renderGate();

      expect(lockHeading()).toBeOnTheScreen();
      expect(appIsReachable()).toBe(false);
    });

    it('should show the app, and no lock screen or cover, when the lock is off', async () => {
      await renderGate({ isLockOn: false });

      expect(appIsReachable()).toBe(true);
      expect(lockHeading()).toBeNull();
      expect(coverIsShown()).toBe(false);
    });

    it('should stay locked when secure storage cannot be read', async () => {
      const { lock } = createTestLock();
      jest.spyOn(lock, 'isLockOn').mockRejectedValue(new Error('Storage is out of reach'));

      await mountGate(lock);

      expect(lockHeading()).toBeOnTheScreen();
      expect(appIsReachable()).toBe(false);
    });
  });

  describe('unlocking', () => {
    it('should show the app, and take the lock screen away, once the right PIN is typed', async () => {
      await renderGate();

      await unlockWithPin();

      expect(appIsReachable()).toBe(true);
      expect(lockHeading()).toBeNull();
    });

    it('should keep what the app had in its state through a lock and an unlock', async () => {
      await renderGate();
      await unlockWithPin();
      fireEvent.press(screen.getByRole('button', { name: 'Add one' }));
      expect(screen.getByText(`${appContent} 1`)).toBeOnTheScreen();

      await awayFor(60_000);
      expect(lockHeading()).toBeOnTheScreen();
      expect(screen.queryByText(`${appContent} 1`)).toBeNull();
      await unlockWithPin();

      expect(screen.getByText(`${appContent} 1`)).toBeOnTheScreen();
    });
  });

  describe('coming back to the app', () => {
    it('should not lock after 59 seconds and 999 milliseconds away', async () => {
      await renderGate();
      await unlockWithPin();

      await awayFor(59_999);

      expect(lockHeading()).toBeNull();
      expect(appIsReachable()).toBe(true);
    });

    it('should lock after 60 seconds away', async () => {
      await renderGate();
      await unlockWithPin();

      await awayFor(60_000);

      expect(lockHeading()).toBeOnTheScreen();
      expect(appIsReachable()).toBe(false);
    });

    it('should not lock after any time in the inactive state, which is the notification shade and Control Center', async () => {
      await renderGate();
      await unlockWithPin();

      await changeAppState('inactive');
      await advance(10 * 60_000);
      await changeAppState('active');

      expect(lockHeading()).toBeNull();
      expect(appIsReachable()).toBe(true);
    });

    it('should count from when the app reached the background, not from when it went inactive', async () => {
      await renderGate();
      await unlockWithPin();

      await changeAppState('inactive');
      await advance(50_000);
      await changeAppState('background');
      await advance(30_000);
      await changeAppState('active');
      await advance(1);

      expect(lockHeading()).toBeNull();
    });

    it('should not lock when the lock is off, however long the app was away', async () => {
      await renderGate({ isLockOn: false });

      await awayFor(10 * 60_000);

      expect(lockHeading()).toBeNull();
      expect(appIsReachable()).toBe(true);
    });

    it('should lock when the lock was turned on while the app was open', async () => {
      const { lock } = await renderGate({ isLockOn: false });
      await act(async () => {
        await lock.setPin(rightPin);
      });
      expect(lockHeading()).toBeNull();

      await awayFor(60_000);

      expect(lockHeading()).toBeOnTheScreen();
    });

    it('should stay locked, with the same lock screen, when the app comes back to it after a while', async () => {
      const { authenticate } = await renderGate({ isBiometricsOn: true, isPromptPassed: false });
      expect(authenticate).toHaveBeenCalledTimes(1);

      await awayFor(5 * 60_000);

      expect(lockHeading()).toBeOnTheScreen();
      expect(authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('the biometrics prompt', () => {
    it('should show once as the lock screen appears, and unlock with no other step when it passes', async () => {
      const { authenticate } = await renderGate({ isBiometricsOn: true });

      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(lockHeading()).toBeNull();
      expect(appIsReachable()).toBe(true);
    });

    it('should show again each time the lock screen appears again', async () => {
      const { authenticate } = await renderGate({ isBiometricsOn: true });

      await awayFor(60_000);

      expect(authenticate).toHaveBeenCalledTimes(2);
    });

    it('should leave the keypad when it is cancelled, and not show again by itself', async () => {
      const { authenticate } = await renderGate({ isBiometricsOn: true, isPromptPassed: false });
      await advance(10_000);

      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(lockHeading()).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '1' })).toBeEnabled();
    });
  });

  describe('while it is locked, nothing behind it can be reached', () => {
    it('should hide the app from a screen reader', async () => {
      await renderGate();

      expect(appIsReachable()).toBe(false);
      expect(screen.queryByRole('button', { name: 'Add one' })).toBeNull();
      expect(
        screen.getByText(new RegExp(appContent), { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('should show the lock screen in a native modal, so it sits above any dialog the app had open', async () => {
      await renderGate();

      expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);
    });

    it('should do nothing when the Android back button asks the lock screen to close', async () => {
      await renderGate();

      act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());

      expect(lockHeading()).toBeOnTheScreen();
      expect(appIsReachable()).toBe(false);
    });

    it('should take the hardware back press itself while locked, and let it go once unlocked', async () => {
      const handlers: ((...args: never[]) => boolean | null | undefined)[] = [];
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
        handlers.push(handler);
        return { remove: () => handlers.splice(handlers.indexOf(handler), 1) };
      });
      await renderGate();

      expect(handlers.map((handler) => handler())).toEqual([true]);

      await unlockWithPin();
      expect(handlers).toEqual([]);
    });

    it('should hold a screen opened by a deep link behind the lock until it is unlocked', async () => {
      const { lock } = createTestLock();
      await lock.setPin(rightPin);
      const { rerender } = await renderThemed(gateElement(lock, <Text>Hub</Text>));
      await act(async () => {});

      // A deep link changes what the app shows without the lock being asked.
      rerender(gateElement(lock, <Text>Linked screen</Text>));

      expect(screen.queryByText('Linked screen')).toBeNull();
      await unlockWithPin();
      expect(screen.getByText('Linked screen')).toBeOnTheScreen();
    });
  });

  describe('Forgot PIN', () => {
    it('should open the forgot PIN variant of clear everything above the lock', async () => {
      await renderGate();

      fireEvent.press(screen.getByRole('button', { name: copy.lock.forgot }));

      expect(screen.getByRole('header', { name: copy.clear.forgotTitle })).toBeOnTheScreen();
      expect(lockHeading()).toBeOnTheScreen();
    });
  });

  describe('hiding the app in the app switcher', () => {
    it('should show the privacy cover on iOS when the app goes inactive while the lock is on', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      await renderGate();
      await unlockWithPin();
      expect(coverIsShown()).toBe(false);

      await changeAppState('inactive');
      expect(coverIsShown()).toBe(true);

      await changeAppState('active');
      expect(coverIsShown()).toBe(false);
    });

    it('should show no cover when the app goes inactive while the lock is off', async () => {
      await renderGate({ isLockOn: false });

      await changeAppState('inactive');

      expect(coverIsShown()).toBe(false);
    });

    it('should show no cover, and not count it as leaving, while the Face ID prompt makes the app inactive', async () => {
      await renderGate({ isBiometricsOn: true, isPromptPassed: false });
      await unlockWithPin();

      await whileBiometricsPromptIsOpen(async () => {
        await changeAppState('inactive');
        expect(coverIsShown()).toBe(false);
      });
      await changeAppState('active');

      expect(coverIsShown()).toBe(false);
      expect(lockHeading()).toBeNull();
    });

    it('should still count a trip to the background that happens while the prompt is up', async () => {
      await renderGate({ isBiometricsOn: true, isPromptPassed: false });
      await unlockWithPin();

      await whileBiometricsPromptIsOpen(async () => {
        await changeAppState('background');
      });
      await advance(60_000);
      await changeAppState('active');
      await advance(1);

      expect(lockHeading()).toBeOnTheScreen();
    });

    it('should block screen capture on Android while the lock is on, and allow it when the lock is turned off', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { lock } = await renderGate();
      await unlockWithPin();
      expect(preventScreenCaptureAsync).toHaveBeenCalled();
      expect(allowScreenCaptureAsync).not.toHaveBeenCalled();

      await act(async () => {
        await lock.clearPin();
      });

      expect(allowScreenCaptureAsync).toHaveBeenCalledTimes(1);
    });

    it('should block screen capture again when the lock is turned back on', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { lock } = await renderGate({ isLockOn: false });
      expect(preventScreenCaptureAsync).not.toHaveBeenCalled();

      await act(async () => {
        await lock.setPin(rightPin);
      });

      expect(preventScreenCaptureAsync).toHaveBeenCalledTimes(1);
    });

    it('should never block screen capture when the lock is off', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      await renderGate({ isLockOn: false });

      expect(preventScreenCaptureAsync).not.toHaveBeenCalled();
    });
  });
});
