import { copy, fillCopy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo } from 'react-native';

import { LockServiceContext, type LockService } from '../../../lock';
import { changeAppState, fakeAppState } from '../../../lock/testing/fakeAppState';
import { createTestLock, type TestLockSetup } from '../../../lock/testing/createTestLock';
import { renderThemed } from '../../../tailwind/renderThemed';
import { LockScreen } from './LockScreen';

const mockClearEverything = jest.fn();
jest.mock('../../../storage/useClearEverything', () => ({
  useClearEverything: () => mockClearEverything,
}));

const rightPin = '4821';
const wrongPin = '1111';
const dotsName = (count: number) => fillCopy(copy.pin.dots, { count, length: 4 });

type Setup = TestLockSetup & { isBiometricsOn?: boolean };

async function renderLockScreen(setup: Setup = {}) {
  const test = createTestLock(setup);
  await test.lock.setPin(rightPin);
  if (setup.isBiometricsOn) await test.lock.setBiometricsChoice(true);
  const onUnlock = jest.fn();
  await mountLockScreen(test.lock, onUnlock);
  return { ...test, onUnlock };
}

async function mountLockScreen(lock: LockService, onUnlock: () => void) {
  await renderThemed(
    <LockServiceContext.Provider value={lock}>
      <LockScreen onUnlock={onUnlock} />
    </LockServiceContext.Provider>,
  );
  await act(async () => {});
}

async function advance(milliseconds: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

function typeDigits(digits: string) {
  [...digits].forEach((digit) => fireEvent.press(screen.getByRole('button', { name: digit })));
}

/** Types a whole PIN and waits for the dots to be held and the PIN checked. */
async function enterPin(pin: string) {
  typeDigits(pin);
  await advance(200);
}

const useBiometricsLink = () => screen.getByRole('button', { name: /^Use Face ID$/ });

describe('LockScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fakeAppState();
    mockClearEverything.mockReset();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('what it shows', () => {
    it('should show only the prompt, the dots and the keypad, with no back control and no app name', async () => {
      await renderLockScreen();

      expect(screen.getByRole('header', { name: copy.lock.title })).toBeOnTheScreen();
      expect(screen.getByRole('text', { name: dotsName(0) })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '5' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.lockSetup.backLabel })).toBeNull();
      expect(screen.queryByText(copy.appName)).toBeNull();
    });

    it('should offer Forgot PIN, and no biometrics link when biometrics are off', async () => {
      await renderLockScreen();

      expect(screen.getByRole('button', { name: copy.lock.forgot })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: /Face ID/ })).toBeNull();
    });
  });

  describe('typing the PIN', () => {
    it('should unlock once, when the right PIN is typed', async () => {
      const { onUnlock } = await renderLockScreen();

      await enterPin(rightPin);

      expect(onUnlock).toHaveBeenCalledTimes(1);
    });

    it('should not unlock before the last number has been held and checked', async () => {
      const { onUnlock } = await renderLockScreen();

      typeDigits(rightPin);

      expect(onUnlock).not.toHaveBeenCalled();
    });

    it('should show the error and clear the dots for a wrong PIN', async () => {
      const { onUnlock } = await renderLockScreen();

      await enterPin(wrongPin);

      expect(screen.getByText(copy.lock.wrong)).toBeOnTheScreen();
      expect(screen.getByRole('text', { name: dotsName(0) })).toBeOnTheScreen();
      expect(onUnlock).not.toHaveBeenCalled();
    });

    it('should count down the tries left from the third wrong PIN in a row', async () => {
      await renderLockScreen();

      await enterPin(wrongPin);
      expect(screen.getByText(copy.lock.wrong)).toBeOnTheScreen();
      await enterPin(wrongPin);
      expect(screen.getByText(copy.lock.wrong)).toBeOnTheScreen();
      await enterPin(wrongPin);
      expect(screen.getByText(fillCopy(copy.lock.wrongFew, { count: 2 }))).toBeOnTheScreen();
      await enterPin(wrongPin);
      expect(screen.getByText(copy.lock.wrongOne)).toBeOnTheScreen();
    });

    it('should say the PIN could not be checked, and stay locked, when secure storage is out of reach', async () => {
      const { lock, onUnlock } = await renderLockScreen();
      jest.spyOn(lock, 'checkPin').mockRejectedValue(new Error('Storage is out of reach'));

      await enterPin(rightPin);

      expect(screen.getByText(copy.lock.checkFailed)).toBeOnTheScreen();
      expect(onUnlock).not.toHaveBeenCalled();
    });

    it('should let the player in when the lock turned out to be off, since there is no PIN to ask for', async () => {
      const { lock, onUnlock } = await renderLockScreen();
      await lock.clearPin();

      await enterPin(rightPin);

      expect(onUnlock).toHaveBeenCalledTimes(1);
    });

    it('should log nothing, so a PIN never reaches the console', async () => {
      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
        jest.spyOn(console, method),
      );
      await renderLockScreen();

      await enterPin(wrongPin);
      await enterPin(rightPin);

      spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    });
  });

  describe('after 5 wrong PINs in a row', () => {
    async function makeFiveWrongTries() {
      const lockScreen = await renderLockScreen();
      for (let attempt = 0; attempt < 5; attempt += 1) await enterPin(wrongPin);
      return lockScreen;
    }

    it('should disable the keypad and count the wait down', async () => {
      await makeFiveWrongTries();

      expect(screen.getByRole('button', { name: '1', disabled: true })).toBeOnTheScreen();
      expect(screen.getByText(fillCopy(copy.lock.wait, { time: '0:30' }))).toBeOnTheScreen();
      await advance(10_000);
      expect(screen.getByText(fillCopy(copy.lock.wait, { time: '0:20' }))).toBeOnTheScreen();
    });

    it('should refuse the right PIN during the wait, and take it once the wait is over', async () => {
      const { onUnlock } = await makeFiveWrongTries();

      fireEvent.press(screen.getByRole('button', { name: '4' }));
      expect(onUnlock).not.toHaveBeenCalled();

      await advance(30_000);
      await enterPin(rightPin);

      expect(screen.getByRole('button', { name: '1' })).toBeEnabled();
      expect(onUnlock).toHaveBeenCalledTimes(1);
    });

    it('should show the wait that is still running when the screen opens again, as after a restart', async () => {
      const { lock } = await makeFiveWrongTries();
      screen.unmount();

      await mountLockScreen(lock, jest.fn());

      expect(screen.getByRole('button', { name: '1', disabled: true })).toBeOnTheScreen();
      expect(screen.getByText(/Too many tries/)).toBeOnTheScreen();
    });
  });

  describe('biometrics', () => {
    it('should show the phone prompt once as the lock screen appears, when biometrics are on', async () => {
      const { authenticate } = await renderLockScreen({ isBiometricsOn: true });

      expect(authenticate).toHaveBeenCalledTimes(1);
      expect(authenticate).toHaveBeenCalledWith(copy.lock.promptMessage);
    });

    it('should unlock, with no other step, when the prompt passes', async () => {
      const { onUnlock } = await renderLockScreen({ isBiometricsOn: true, isPromptPassed: true });

      expect(onUnlock).toHaveBeenCalledTimes(1);
    });

    it('should leave the keypad and a link to try again when the prompt is cancelled', async () => {
      const { onUnlock } = await renderLockScreen({ isBiometricsOn: true, isPromptPassed: false });

      expect(onUnlock).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: '1' })).toBeEnabled();
      expect(useBiometricsLink()).toBeOnTheScreen();
    });

    it('should ask the phone again, and unlock, when the link is pressed and the prompt passes', async () => {
      const { authenticate, setPromptPassed, onUnlock } = await renderLockScreen({
        isBiometricsOn: true,
        isPromptPassed: false,
      });
      setPromptPassed(true);

      fireEvent.press(useBiometricsLink());
      await act(async () => {});

      expect(authenticate).toHaveBeenCalledTimes(2);
      expect(onUnlock).toHaveBeenCalledTimes(1);
    });

    it('should not show the prompt again when the screen renders again', async () => {
      const { authenticate } = await renderLockScreen({
        isBiometricsOn: true,
        isPromptPassed: false,
      });

      await advance(5_000);
      await changeAppState('active');

      expect(authenticate).toHaveBeenCalledTimes(1);
    });

    it('should not show the prompt again when the screen is given a new unlock function', async () => {
      const { lock, authenticate } = await renderLockScreen({
        isBiometricsOn: true,
        isPromptPassed: false,
      });

      screen.rerender(
        <LockServiceContext.Provider value={lock}>
          <LockScreen onUnlock={jest.fn()} />
        </LockServiceContext.Provider>,
      );
      await act(async () => {});

      expect(authenticate).toHaveBeenCalledTimes(1);
    });

    it('should ask the phone only once more when the link is pressed twice while it is asking', async () => {
      const { authenticate } = await renderLockScreen({
        isBiometricsOn: true,
        isPromptPassed: false,
      });
      let closePrompt: (isPassed: boolean) => void = () => {};
      authenticate.mockImplementation(
        () => new Promise<boolean>((resolve) => (closePrompt = resolve)),
      );

      fireEvent.press(useBiometricsLink());
      fireEvent.press(useBiometricsLink());
      await act(async () => {});

      expect(authenticate).toHaveBeenCalledTimes(2);
      await act(async () => closePrompt(false));
    });

    it('should show no prompt and no link when biometrics are off', async () => {
      const { authenticate } = await renderLockScreen({ isBiometricsOn: false });

      expect(authenticate).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /Face ID/ })).toBeNull();
    });

    it('should show no prompt and no link when the phone no longer has biometrics set up', async () => {
      const { authenticate } = await renderLockScreen({ isBiometricsOn: true, isEnrolled: false });

      expect(authenticate).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /unlock|Face ID/i })).toBeNull();
    });

    it('should still unlock with biometrics during a wait', async () => {
      const { lock, setPromptPassed, onUnlock } = await renderLockScreen({
        isBiometricsOn: true,
        isPromptPassed: false,
      });
      for (let attempt = 0; attempt < 5; attempt += 1) await enterPin(wrongPin);
      expect(screen.getByRole('button', { name: '1', disabled: true })).toBeOnTheScreen();
      setPromptPassed(true);

      fireEvent.press(useBiometricsLink());
      await act(async () => {});

      expect(onUnlock).toHaveBeenCalledTimes(1);
      expect(await lock.getWaitRemainingMilliseconds()).toBe(0);
    });

    it('should forget what was typed when the app is left, as the PIN steps do', async () => {
      await renderLockScreen({ isBiometricsOn: true, isPromptPassed: false });
      typeDigits('12');

      await changeAppState('background');

      expect(screen.getByRole('text', { name: dotsName(0) })).toBeOnTheScreen();
    });
  });

  describe('Forgot PIN', () => {
    it('should open the forgot PIN variant of clear everything', async () => {
      await renderLockScreen();

      fireEvent.press(screen.getByRole('button', { name: copy.lock.forgot }));

      expect(screen.getByRole('header', { name: copy.clear.forgotTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.clear.forgotBody)).toBeOnTheScreen();
    });

    it('should go back to the lock screen on Cancel, still locked', async () => {
      const { onUnlock } = await renderLockScreen();
      fireEvent.press(screen.getByRole('button', { name: copy.lock.forgot }));

      fireEvent.press(screen.getByRole('button', { name: copy.clear.cancel }));

      expect(screen.queryByText(copy.clear.forgotTitle)).toBeNull();
      expect(screen.getByRole('header', { name: copy.lock.title })).toBeOnTheScreen();
      expect(onUnlock).not.toHaveBeenCalled();
    });

    it('should run clear everything when it is confirmed, and not unlock by itself', async () => {
      mockClearEverything.mockResolvedValue({ ok: true });
      const { onUnlock } = await renderLockScreen();
      fireEvent.press(screen.getByRole('button', { name: copy.lock.forgot }));

      fireEvent.press(screen.getByRole('button', { name: copy.clear.confirm }));
      await act(async () => {});

      expect(mockClearEverything).toHaveBeenCalledTimes(1);
      expect(onUnlock).not.toHaveBeenCalled();
    });
  });
});
