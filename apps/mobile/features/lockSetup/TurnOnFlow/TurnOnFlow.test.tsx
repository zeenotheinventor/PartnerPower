import { copy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo, Platform } from 'react-native';

import { LockServiceContext, type BiometricsAvailability } from '../../../lock';
import { createTestLock, type TestLockSetup } from '../../../lock/testing/createTestLock';
import { renderThemed } from '../../../tailwind/renderThemed';
import { TurnOnFlow } from './TurnOnFlow';

const pin = '4821';
const faceIdKind = copy.biometrics.kinds.faceId;

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
}

async function renderFlow({
  availability = { isAvailable: true, kind: 'face', kinds: ['face'] },
  lockSetup,
}: { availability?: BiometricsAvailability; lockSetup?: TestLockSetup } = {}) {
  const testLock = createTestLock(lockSetup);
  const onExit = jest.fn();
  await renderThemed(
    <LockServiceContext.Provider value={testLock.lock}>
      <TurnOnFlow availability={availability} onExit={onExit} />
    </LockServiceContext.Provider>,
  );
  await settle();
  return { ...testLock, onExit };
}

async function typePin(digits: string) {
  [...digits].forEach((digit) => fireEvent.press(screen.getByRole('button', { name: digit })));
  await settle();
}

async function chooseAndConfirm(digits = pin) {
  fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.start }));
  await typePin(digits);
  await typePin(digits);
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('TurnOnFlow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
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

  it('should start with the explainer', async () => {
    await renderFlow();

    expect(screen.getByText(copy.lockSetup.explainerHeading)).toBeOnTheScreen();
  });

  it('should leave from the explainer without turning the lock on', async () => {
    const { lock, onExit } = await renderFlow();

    press(copy.lockSetup.backLabel);

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(await lock.isLockOn()).toBe(false);
  });

  it('should ask for a PIN after the explainer, and go back to the explainer from it', async () => {
    await renderFlow();

    press(copy.lockSetup.start);
    expect(screen.getByRole('header', { name: copy.lockSetup.enterTitle })).toBeOnTheScreen();
    press(copy.lockSetup.backLabel);

    expect(screen.getByText(copy.lockSetup.explainerHeading)).toBeOnTheScreen();
  });

  describe('turning it on', () => {
    it('should save the PIN through the lock service once it is confirmed', async () => {
      const { lock } = await renderFlow();

      await chooseAndConfirm();

      expect(await lock.isLockOn()).toBe(true);
      expect((await lock.checkPin(pin)).status).toBe('correct');
    });

    it('should not save anything before the PIN is confirmed', async () => {
      const { lock } = await renderFlow();

      fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.start }));
      await typePin(pin);

      expect(await lock.isLockOn()).toBe(false);
    });

    it('should keep the PIN out of every name, text and announcement', async () => {
      await renderFlow();
      const everythingSeen: string[] = [];
      const record = () => everythingSeen.push(JSON.stringify(screen.toJSON()), ...announcements());

      fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.start }));
      await typePin(pin);
      record();
      await typePin(pin);
      record();

      everythingSeen.forEach((seen) => expect(seen).not.toContain(pin));
    });

    it('should show the error when the PIN fails to save, and stay on the second step', async () => {
      const { lock } = await renderFlow();
      jest.spyOn(lock, 'setPin').mockRejectedValueOnce(new Error('Storage failed'));

      await chooseAndConfirm();

      expect(screen.getByText(copy.lock.saveFailed)).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: copy.lockSetup.confirmTitle })).toBeOnTheScreen();
      expect(await lock.isLockOn()).toBe(false);
    });
  });

  describe('when the two PINs differ', () => {
    it('should show the error, start again at the first step and save nothing', async () => {
      const { lock } = await renderFlow();

      fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.start }));
      await typePin(pin);
      await typePin('1111');

      expect(screen.getByText(copy.lockSetup.mismatch)).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: copy.lockSetup.enterTitle })).toBeOnTheScreen();
      expect(await lock.isLockOn()).toBe(false);
    });

    it('should turn the lock on once a PIN is then confirmed', async () => {
      const { lock } = await renderFlow();
      fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.start }));
      await typePin(pin);
      await typePin('1111');

      await typePin(pin);
      await typePin(pin);

      expect(await lock.isLockOn()).toBe(true);
    });
  });

  describe('the biometrics offer', () => {
    it('should follow the PIN when the phone has biometrics set up', async () => {
      await renderFlow();

      await chooseAndConfirm();

      expect(screen.getByRole('header', { name: faceIdKind.title })).toBeOnTheScreen();
    });

    it('should name the kind the phone has, on iOS and on Android', async () => {
      setPlatform('android');
      await renderFlow({
        availability: { isAvailable: true, kind: 'fingerprint', kinds: ['fingerprint'] },
      });

      await chooseAndConfirm();

      expect(
        screen.getByRole('header', { name: copy.biometrics.kinds.fingerprint.title }),
      ).toBeOnTheScreen();
    });

    it('should save the choice only after the phone has asked and the player has passed', async () => {
      const { lock, authenticate } = await renderFlow();
      await chooseAndConfirm();
      expect(await lock.getBiometricsChoice()).toBe(false);

      press(faceIdKind.yes);
      await settle();

      expect(authenticate).toHaveBeenCalledWith(copy.biometrics.checkReason);
      expect(await lock.getBiometricsChoice()).toBe(true);
    });

    it('should go to done, naming the kind, after biometrics are turned on', async () => {
      await renderFlow();
      await chooseAndConfirm();

      press(faceIdKind.yes);
      await settle();

      expect(screen.getByRole('header', { name: copy.lockSetup.doneTitle })).toBeOnTheScreen();
      expect(screen.getByText(faceIdKind.doneBody)).toBeOnTheScreen();
    });

    it('should save nothing and show the error when the check fails', async () => {
      const { lock, secureBackend } = await renderFlow({ lockSetup: { isPromptPassed: false } });
      await chooseAndConfirm();

      press(faceIdKind.yes);
      await settle();

      expect(screen.getByText(copy.biometrics.failed)).toBeOnTheScreen();
      expect(await lock.getBiometricsChoice()).toBe(false);
      expect(secureBackend.entries.has('lockBiometricsChoice')).toBe(false);
    });

    it('should save the choice after a failed check is tried again and passes', async () => {
      const { lock, setPromptPassed } = await renderFlow({ lockSetup: { isPromptPassed: false } });
      await chooseAndConfirm();
      press(faceIdKind.yes);
      await settle();

      setPromptPassed(true);
      press(faceIdKind.yes);
      await settle();

      expect(await lock.getBiometricsChoice()).toBe(true);
    });

    it('should save nothing with Not now, and go to done with the PIN line', async () => {
      const { lock, authenticate, secureBackend } = await renderFlow();
      await chooseAndConfirm();

      press(copy.biometrics.notNow);

      expect(authenticate).not.toHaveBeenCalled();
      expect(secureBackend.entries.has('lockBiometricsChoice')).toBe(false);
      expect(await lock.isLockOn()).toBe(true);
      expect(screen.getByText(copy.lockSetup.doneBody)).toBeOnTheScreen();
    });

    it('should be skipped when the phone has no biometrics set up', async () => {
      await renderFlow({ availability: { isAvailable: false } });

      await chooseAndConfirm();

      expect(screen.getByRole('header', { name: copy.lockSetup.doneTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.lockSetup.doneBody)).toBeOnTheScreen();
    });
  });

  it('should leave for Settings from done', async () => {
    const { onExit } = await renderFlow({ availability: { isAvailable: false } });
    await chooseAndConfirm();

    press(copy.lockSetup.done);

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

function announcements(): string[] {
  return jest.mocked(AccessibilityInfo.announceForAccessibility).mock.calls.map(([line]) => line);
}
