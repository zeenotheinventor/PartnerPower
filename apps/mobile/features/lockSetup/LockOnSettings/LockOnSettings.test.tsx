import { copy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo, Platform } from 'react-native';

import { LockServiceContext, type BiometricsAvailability } from '../../../lock';
import { createTestLock, type TestLockSetup } from '../../../lock/testing/createTestLock';
import { renderThemed } from '../../../tailwind/renderThemed';
import { LockOnSettings } from './LockOnSettings';

const pin = '4821';
const wrongPin = '1111';
const faceIdKind = copy.biometrics.kinds.faceId;
const faceAvailable: BiometricsAvailability = { isAvailable: true, kind: 'face', kinds: ['face'] };

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
}

// The lock is on with the PIN, and with biometrics on when asked.
async function renderSettings({
  availability = faceAvailable,
  isBiometricsOn = false,
  lockSetup,
  beforeRender,
}: {
  availability?: BiometricsAvailability;
  isBiometricsOn?: boolean;
  lockSetup?: TestLockSetup;
  beforeRender?: (lock: ReturnType<typeof createTestLock>['lock']) => Promise<void>;
} = {}) {
  const testLock = createTestLock(lockSetup);
  await testLock.lock.setPin(pin);
  if (isBiometricsOn) await testLock.lock.setBiometricsChoice(true);
  await beforeRender?.(testLock.lock);
  const onExit = jest.fn();
  await renderThemed(
    <LockServiceContext.Provider value={testLock.lock}>
      <LockOnSettings availability={availability} isBiometricsOn={isBiometricsOn} onExit={onExit} />
    </LockServiceContext.Provider>,
  );
  await settle();
  return { ...testLock, onExit };
}

async function typePin(digits: string) {
  [...digits].forEach((digit) => fireEvent.press(screen.getByRole('button', { name: digit })));
  await settle();
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const heading = (name: string) => screen.getByRole('header', { name });
const biometricsSwitch = (options: { disabled?: boolean } = {}) =>
  screen.getByRole('switch', { name: faceIdKind.toggleLabel, ...options });
const announced = () =>
  jest.mocked(AccessibilityInfo.announceForAccessibility).mock.calls.map(([line]) => line);

describe('LockOnSettings', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.UTC(2026, 10, 19, 9, 0, 0));
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockClear()
      .mockImplementation(() => {});
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    setPlatform('ios');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the status', () => {
    it('should say the lock is on and offer Change PIN, the biometrics switch and Turn off', async () => {
      await renderSettings();

      expect(heading(copy.lockSettings.title)).toBeOnTheScreen();
      expect(screen.getByText(copy.lockSettings.statusOn)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.lockSettings.changePin })).toBeOnTheScreen();
      expect(biometricsSwitch()).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.lockSettings.turnOff })).toBeOnTheScreen();
    });

    it('should leave from the back button', async () => {
      const { onExit } = await renderSettings();

      press(copy.lockSetup.backLabel);

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('should show the switch off when biometrics are not turned on', async () => {
      await renderSettings();
      expect(biometricsSwitch()).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ checked: false }),
      );
    });

    it('should show the switch on when biometrics are turned on', async () => {
      await renderSettings({ isBiometricsOn: true });

      expect(biometricsSwitch()).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ checked: true }),
      );
    });

    it('should name the kind the phone has on the switch', async () => {
      setPlatform('android');
      await renderSettings({
        availability: { isAvailable: true, kind: 'fingerprint', kinds: ['fingerprint'] },
      });

      expect(
        screen.getByRole('switch', { name: copy.biometrics.kinds.fingerprint.toggleLabel }),
      ).toBeOnTheScreen();
    });
  });

  describe('when the phone has no biometrics set up', () => {
    it('should disable the switch, with the reason as its hint and its caption', async () => {
      await renderSettings({ availability: { isAvailable: false } });

      const words = copy.biometrics.kinds.phoneUnlock;
      const biometrics = screen.getByRole('switch', { name: words.toggleLabel, disabled: true });
      expect(biometrics.props.accessibilityHint).toBe(words.unavailable);
      expect(screen.getByText(words.unavailable)).toBeOnTheScreen();
    });

    it('should leave the switch off even if a choice was stored', async () => {
      await renderSettings({ availability: { isAvailable: false }, isBiometricsOn: true });

      expect(
        screen.getByRole('switch', {
          name: copy.biometrics.kinds.phoneUnlock.toggleLabel,
          disabled: true,
        }),
      ).toHaveProp('accessibilityState', expect.objectContaining({ checked: false }));
    });
  });

  describe('the biometrics switch', () => {
    it('should ask the phone once and then save the choice when it is turned on', async () => {
      const { lock, authenticate } = await renderSettings();

      fireEvent.press(biometricsSwitch());
      await settle();

      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(authenticate).toHaveBeenCalledWith(copy.biometrics.checkReason);
      expect(await lock.getBiometricsChoice()).toBe(true);
      expect(biometricsSwitch()).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ checked: true }),
      );
    });

    it('should save nothing, keep the switch off and say so when the check fails', async () => {
      const { lock, secureBackend } = await renderSettings({
        lockSetup: { isPromptPassed: false },
      });

      fireEvent.press(biometricsSwitch());
      await settle();

      expect(await lock.getBiometricsChoice()).toBe(false);
      expect(secureBackend.entries.has('lockBiometricsChoice')).toBe(false);
      expect(biometricsSwitch()).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ checked: false }),
      );
      expect(screen.getByText(copy.biometrics.toggleFailed)).toBeOnTheScreen();
      expect(announced()).toContain(copy.biometrics.toggleFailed);
    });

    it('should turn off without asking the phone, and save the choice', async () => {
      const { lock, authenticate } = await renderSettings({ isBiometricsOn: true });

      fireEvent.press(biometricsSwitch());
      await settle();

      expect(authenticate).not.toHaveBeenCalled();
      expect(await lock.getBiometricsChoice()).toBe(false);
      expect(biometricsSwitch()).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ checked: false }),
      );
    });

    it('should clear an earlier failure line when it is tried again', async () => {
      const { setPromptPassed } = await renderSettings({ lockSetup: { isPromptPassed: false } });
      fireEvent.press(biometricsSwitch());
      await settle();

      setPromptPassed(true);
      fireEvent.press(biometricsSwitch());
      await settle();

      expect(screen.queryByText(copy.biometrics.toggleFailed)).toBeNull();
    });
  });

  describe('Change PIN', () => {
    it('should ask for the current PIN first, and say why', async () => {
      await renderSettings();

      press(copy.lockSettings.changePin);

      expect(heading(copy.lockSettings.currentTitle)).toBeOnTheScreen();
      expect(screen.getByText(copy.lockSettings.currentForChange)).toBeOnTheScreen();
    });

    it('should go back to the status from the current PIN step', async () => {
      await renderSettings();
      press(copy.lockSettings.changePin);

      press(copy.lockSetup.backLabel);

      expect(screen.getByText(copy.lockSettings.statusOn)).toBeOnTheScreen();
    });

    it('should show the error and stay on the step for a wrong current PIN', async () => {
      await renderSettings();
      press(copy.lockSettings.changePin);

      await typePin(wrongPin);

      expect(screen.getByText(copy.lock.wrong)).toBeOnTheScreen();
      expect(heading(copy.lockSettings.currentTitle)).toBeOnTheScreen();
      expect(screen.getByRole('text', { name: '0 of 4 digits entered' })).toBeOnTheScreen();
    });

    it('should count wrong current PINs toward the wait, and disable the keys with a countdown at the fifth', async () => {
      const { lock } = await renderSettings();
      press(copy.lockSettings.changePin);

      for (let attempt = 0; attempt < 5; attempt += 1) await typePin(wrongPin);

      expect(screen.getByText('Too many tries. Try again in 0:30.')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '1', disabled: true })).toBeOnTheScreen();
      expect(await lock.getWaitRemainingMilliseconds()).toBeGreaterThan(0);
    });

    it('should not let the right PIN through during the wait', async () => {
      await renderSettings();
      press(copy.lockSettings.changePin);
      for (let attempt = 0; attempt < 5; attempt += 1) await typePin(wrongPin);

      await typePin(pin);

      expect(heading(copy.lockSettings.currentTitle)).toBeOnTheScreen();
    });

    it('should enable the keys again when the wait is over', async () => {
      await renderSettings();
      press(copy.lockSettings.changePin);
      for (let attempt = 0; attempt < 5; attempt += 1) await typePin(wrongPin);

      for (let second = 0; second < 31; second += 1) {
        await act(async () => {
          await jest.advanceTimersByTimeAsync(1000);
        });
      }

      expect(screen.queryByText(/Too many tries/)).toBeNull();
      expect(screen.getByRole('button', { name: '1', disabled: false })).toBeOnTheScreen();
    });

    it('should show a wait that was already running, as after a restart', async () => {
      await renderSettings({
        beforeRender: async (lock) => {
          for (let attempt = 0; attempt < 5; attempt += 1) await lock.checkPin(wrongPin);
        },
      });

      press(copy.lockSettings.changePin);
      await settle();

      expect(screen.getByText(/Too many tries. Try again in 0:/)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '1', disabled: true })).toBeOnTheScreen();
    });

    it('should ask for a new PIN after the right current one', async () => {
      await renderSettings();
      press(copy.lockSettings.changePin);

      await typePin(pin);

      expect(heading(copy.lockSettings.newTitle)).toBeOnTheScreen();
    });

    it('should save the new PIN once it is confirmed, so the old PIN no longer works', async () => {
      const { lock } = await renderSettings();
      press(copy.lockSettings.changePin);
      await typePin(pin);

      await typePin('1357');
      await typePin('1357');

      expect((await lock.checkPin(pin)).status).toBe('wrong');
      expect((await lock.checkPin('1357')).status).toBe('correct');
    });

    it('should return to the status and announce that the PIN changed', async () => {
      await renderSettings();
      press(copy.lockSettings.changePin);
      await typePin(pin);

      await typePin('1357');
      await typePin('1357');

      expect(screen.getByText(copy.lockSettings.statusOn)).toBeOnTheScreen();
      expect(announced()).toContain(copy.lockSettings.changed);
    });

    it('should keep the old PIN and show the error when the new PINs do not match', async () => {
      const { lock } = await renderSettings();
      press(copy.lockSettings.changePin);
      await typePin(pin);

      await typePin('1357');
      await typePin('2468');

      expect(screen.getByText(copy.lockSetup.mismatch)).toBeOnTheScreen();
      expect((await lock.checkPin(pin)).status).toBe('correct');
    });

    it('should unlock the step with biometrics when they are on, and not when they are off', async () => {
      await renderSettings({ isBiometricsOn: true });
      press(copy.lockSettings.changePin);

      press(faceIdKind.tryAgain);
      await settle();

      expect(heading(copy.lockSettings.newTitle)).toBeOnTheScreen();
    });

    it('should not show the biometrics link when biometrics are off', async () => {
      await renderSettings({ isBiometricsOn: false });
      press(copy.lockSettings.changePin);

      expect(screen.queryByRole('button', { name: faceIdKind.tryAgain })).toBeNull();
    });

    it('should stay on the step when the biometrics check fails', async () => {
      await renderSettings({ isBiometricsOn: true, lockSetup: { isPromptPassed: false } });
      press(copy.lockSettings.changePin);

      press(faceIdKind.tryAgain);
      await settle();

      expect(heading(copy.lockSettings.currentTitle)).toBeOnTheScreen();
    });
  });

  describe('Turn off', () => {
    it('should ask for the current PIN first, and say why', async () => {
      await renderSettings();

      press(copy.lockSettings.turnOff);

      expect(heading(copy.lockSettings.currentTitle)).toBeOnTheScreen();
      expect(screen.getByText(copy.lockSettings.currentForOff)).toBeOnTheScreen();
    });

    it('should leave the lock on for a wrong current PIN', async () => {
      const { lock, onExit } = await renderSettings();
      press(copy.lockSettings.turnOff);

      await typePin(wrongPin);

      expect(await lock.isLockOn()).toBe(true);
      expect(onExit).not.toHaveBeenCalled();
      expect(screen.getByText(copy.lock.wrong)).toBeOnTheScreen();
    });

    it('should count a wrong current PIN toward the wait', async () => {
      await renderSettings();
      press(copy.lockSettings.turnOff);

      for (let attempt = 0; attempt < 5; attempt += 1) await typePin(wrongPin);

      expect(screen.getByText('Too many tries. Try again in 0:30.')).toBeOnTheScreen();
    });

    it('should remove the PIN hash and the biometrics choice, and leave for Settings', async () => {
      const { lock, secureBackend, onExit } = await renderSettings({ isBiometricsOn: true });
      expect(secureBackend.entries.has('lockPinHash')).toBe(true);
      expect(secureBackend.entries.has('lockBiometricsChoice')).toBe(true);
      press(copy.lockSettings.turnOff);

      await typePin(pin);

      expect(await lock.isLockOn()).toBe(false);
      expect(await lock.getBiometricsChoice()).toBe(false);
      expect(secureBackend.entries.has('lockPinHash')).toBe(false);
      expect(secureBackend.entries.has('lockBiometricsChoice')).toBe(false);
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('should announce that the lock is off', async () => {
      await renderSettings();
      press(copy.lockSettings.turnOff);

      await typePin(pin);

      expect(announced()).toContain(copy.lockSettings.off);
    });

    it('should turn off with biometrics in place of the PIN', async () => {
      const { lock, onExit } = await renderSettings({ isBiometricsOn: true });
      press(copy.lockSettings.turnOff);

      press(faceIdKind.tryAgain);
      await settle();

      expect(await lock.isLockOn()).toBe(false);
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('should show the failure and stay in Settings when the PIN cannot be removed', async () => {
      const { lock, onExit } = await renderSettings();
      jest.spyOn(lock, 'clearPin').mockRejectedValueOnce(new Error('Storage failed'));
      press(copy.lockSettings.turnOff);

      await typePin(pin);

      expect(screen.getByText(copy.lock.saveFailed)).toBeOnTheScreen();
      expect(screen.getByText(copy.lockSettings.statusOn)).toBeOnTheScreen();
      expect(onExit).not.toHaveBeenCalled();
      expect(await lock.isLockOn()).toBe(true);
    });
  });
});
