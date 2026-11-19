import { colorThemes } from '@getfreak/tokens';
import { act, screen } from 'nativewind/test';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';

import { renderThemed } from '../../../tailwind/renderThemed';
import { Countdown } from './Countdown';
import type { CountdownProps } from './types';

const startTime = new Date('2026-01-01T12:00:00Z').getTime();
const label = 'Time left';
const endText = "Time's up";
const secondsText = (count: number) => `${count} ${count === 1 ? 'second' : 'seconds'}`;

// The app state listener is captured so a test can send the app to the background and back.
type StateListener = (state: AppStateStatus) => void;
let stateListeners: StateListener[];
let removeListener: jest.Mock;

function changeAppState(state: AppStateStatus) {
  stateListeners.forEach((listener) => listener(state));
}

function countdownWith(props: Partial<CountdownProps>) {
  return (
    <Countdown
      seconds={60}
      startedAt={startTime}
      label={label}
      secondsText={secondsText}
      endText={endText}
      {...props}
    />
  );
}

// Every countdown is taken off the screen after its test, so none keeps a clock running into the next.
const mountedCountdowns: Array<{ unmount: () => void }> = [];

async function renderCountdown(
  props: Partial<CountdownProps> = {},
  themeName: 'light' | 'dark' = 'light',
) {
  const rendered = await renderThemed(countdownWith(props), themeName);
  mountedCountdowns.push(rendered);
  return rendered;
}

const timer = () => screen.getByRole('timer', { name: label });

/**
 * How many timers are waiting. Running an `act` leaves one short timer of the test renderer's own,
 * and a 1 ms step clears it without reaching one of the countdown's, which is a second or less
 * away only at the instant it is due.
 */
function pendingTimers() {
  jest.advanceTimersByTime(1);
  return jest.getTimerCount();
}

/** Moves the clock on and lets the timers that fall due run. */
async function advance(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
}

describe('Countdown', () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers({ now: startTime });
    stateListeners = [];
    removeListener = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      stateListeners.push(listener);
      return { remove: removeListener };
    });
    // The announcement is already a mock under Jest, so the calls of an earlier test are cleared.
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
    announce.mockClear();
  });

  afterEach(() => {
    mountedCountdowns.splice(0).forEach((rendered) => rendered.unmount());
    jest.restoreAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.useRealTimers();
  });

  describe('before it starts', () => {
    it('should show the full time and name itself as a timer', async () => {
      await renderCountdown({ startedAt: null });

      expect(timer()).toHaveAccessibilityValue({ text: '60 seconds' });
      expect(screen.getByText('1:00')).toBeOnTheScreen();
    });

    it('should not count down, set a timer or end', async () => {
      const onEnd = jest.fn();
      await renderCountdown({ startedAt: null, onEnd });

      await advance(120_000);

      expect(screen.getByText('1:00')).toBeOnTheScreen();
      expect(onEnd).not.toHaveBeenCalled();
      expect(pendingTimers()).toBe(0);
    });
  });

  describe('running', () => {
    it('should show the time left in minutes and seconds', async () => {
      await renderCountdown({ startedAt: startTime - 18_000 });

      expect(screen.getByText('0:42')).toBeOnTheScreen();
      expect(timer()).toHaveAccessibilityValue({ text: '42 seconds' });
    });

    it('should count down once a second, rounding the part second up', async () => {
      await renderCountdown({ startedAt: startTime - 500 });
      expect(screen.getByText('1:00')).toBeOnTheScreen();

      await advance(500);
      expect(screen.getByText('0:59')).toBeOnTheScreen();

      await advance(1000);
      expect(screen.getByText('0:58')).toBeOnTheScreen();
      expect(timer()).toHaveAccessibilityValue({ text: '58 seconds' });
    });

    it('should say one second in the singular', async () => {
      await renderCountdown({ seconds: 5, startedAt: startTime - 4_000 });

      expect(timer()).toHaveAccessibilityValue({ text: '1 second' });
    });
  });

  describe('at zero', () => {
    it('should show 0:00 and call onEnd once', async () => {
      const onEnd = jest.fn();
      await renderCountdown({ seconds: 3, startedAt: startTime, onEnd });

      await advance(2_900);
      expect(onEnd).not.toHaveBeenCalled();
      await advance(100);

      expect(screen.getByText('0:00')).toBeOnTheScreen();
      expect(timer()).toHaveAccessibilityValue({ text: '0 seconds' });
      expect(onEnd).toHaveBeenCalledTimes(1);

      await advance(10_000);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('should leave no timer running once it has ended', async () => {
      await renderCountdown({ seconds: 2, startedAt: startTime });

      await advance(2_000);

      expect(pendingTimers()).toBe(0);
    });

    it('should end at once when it started longer ago than its length', async () => {
      const onEnd = jest.fn();
      await renderCountdown({ seconds: 10, startedAt: startTime - 60_000, onEnd });

      expect(screen.getByText('0:00')).toBeOnTheScreen();
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('should end again after it is started again', async () => {
      const onEnd = jest.fn();
      const rendered = await renderCountdown({ seconds: 2, startedAt: startTime, onEnd });
      await advance(2_000);
      expect(onEnd).toHaveBeenCalledTimes(1);

      await act(async () =>
        rendered.rerender(countdownWith({ seconds: 2, startedAt: Date.now(), onEnd })),
      );
      expect(screen.getByText('0:02')).toBeOnTheScreen();
      await advance(2_000);

      expect(onEnd).toHaveBeenCalledTimes(2);
    });
  });

  describe('what a screen reader hears', () => {
    it('should announce at 30 and 10 seconds left and at zero, and never every second', async () => {
      await renderCountdown({ seconds: 60, startedAt: startTime });

      await advance(60_000);

      expect(announce.mock.calls).toEqual([['30 seconds'], ['10 seconds'], [endText]]);
    });

    it('should announce only the end of a countdown that is no longer than the points', async () => {
      await renderCountdown({ seconds: 10, startedAt: startTime });

      await advance(10_000);

      expect(announce.mock.calls).toEqual([[endText]]);
    });

    it('should announce nothing before it starts', async () => {
      await renderCountdown({ startedAt: null });

      await advance(60_000);

      expect(announce).not.toHaveBeenCalled();
    });
  });

  describe('real time and the app going to the background', () => {
    it('should stop its timer when the app leaves the foreground', async () => {
      await renderCountdown();
      expect(pendingTimers()).toBeGreaterThan(0);

      await act(async () => changeAppState('background'));

      expect(pendingTimers()).toBe(0);
    });

    it('should show the real time left, not a paused one, when the app comes back', async () => {
      await renderCountdown();
      await act(async () => changeAppState('background'));

      jest.setSystemTime(startTime + 25_000);
      await act(async () => changeAppState('active'));

      expect(screen.getByText('0:35')).toBeOnTheScreen();
      await advance(1_000);
      expect(screen.getByText('0:34')).toBeOnTheScreen();
    });

    it('should end when the app comes back after the time is up, and not before', async () => {
      const onEnd = jest.fn();
      await renderCountdown({ seconds: 30, onEnd });
      await act(async () => changeAppState('inactive'));

      await advance(40_000);
      expect(onEnd).not.toHaveBeenCalled();
      await act(async () => changeAppState('active'));

      expect(screen.getByText('0:00')).toBeOnTheScreen();
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(announce).toHaveBeenCalledWith(endText);
    });

    it('should start its bar again from the real time left when the app comes back', async () => {
      const withTiming = jest.spyOn(Reanimated, 'withTiming');
      await renderCountdown({ seconds: 60 });
      expect(withTiming).toHaveBeenCalledTimes(1);
      expect(withTiming).toHaveBeenLastCalledWith(0, expect.objectContaining({ duration: 60_000 }));
      await act(async () => changeAppState('background'));

      // Less than a second has gone, so the digits do not change and only the return restarts the bar.
      jest.setSystemTime(startTime + 200);
      await act(async () => changeAppState('active'));

      expect(screen.getByText('1:00')).toBeOnTheScreen();
      expect(withTiming).toHaveBeenCalledTimes(2);
      expect(withTiming).toHaveBeenLastCalledWith(0, expect.objectContaining({ duration: 59_800 }));
    });

    it('should not end a second time when the app comes back after it has ended', async () => {
      const onEnd = jest.fn();
      await renderCountdown({ seconds: 2, onEnd });
      await advance(2_000);
      expect(onEnd).toHaveBeenCalledTimes(1);

      await act(async () => changeAppState('background'));
      await act(async () => changeAppState('active'));

      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(announce.mock.calls.filter(([text]) => text === endText)).toHaveLength(1);
    });
  });

  describe('when it is taken off the screen', () => {
    it('should clear its timer, stop listening to the app and never call onEnd', async () => {
      const onEnd = jest.fn();
      const rendered = await renderCountdown({ seconds: 5, onEnd });
      expect(pendingTimers()).toBeGreaterThan(0);

      rendered.unmount();

      expect(pendingTimers()).toBe(0);
      expect(removeListener).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(10_000);
      expect(onEnd).not.toHaveBeenCalled();
      expect(announce).not.toHaveBeenCalled();
    });
  });

  describe('the bar', () => {
    it('should drain over the time left', async () => {
      const withTiming = jest.spyOn(Reanimated, 'withTiming');

      await renderCountdown({ seconds: 60, startedAt: startTime - 18_000 });

      expect(withTiming).toHaveBeenCalledTimes(1);
      // Jest's Reanimated mock gives every easing the same function, so the easing is not checked.
      expect(withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 42_000 }));
    });

    it('should not animate before it starts', async () => {
      const withTiming = jest.spyOn(Reanimated, 'withTiming');

      await renderCountdown({ startedAt: null });

      expect(withTiming).not.toHaveBeenCalled();
    });

    it('should not use a timing at all with reduce motion on', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      const withTiming = jest.spyOn(Reanimated, 'withTiming');

      await renderCountdown({ seconds: 5 });
      await advance(5_000);

      expect(withTiming).not.toHaveBeenCalled();
      expect(screen.getByText('0:00')).toBeOnTheScreen();
    });
  });

  describe.each(['light', 'dark'] as const)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should draw a surface box with a 2 border and a 48 minimum height', async () => {
      await renderCountdown({ seconds: 60, startedAt: startTime }, themeName);

      expect(timer()).toHaveStyle({
        backgroundColor: theme.surface.toLowerCase(),
        borderColor: theme.border.toLowerCase(),
        borderWidth: 2,
        minHeight: 48,
      });
    });

    it('should turn the border to the accent colour at zero', async () => {
      await renderCountdown({ seconds: 2, startedAt: startTime }, themeName);
      await advance(2_000);

      expect(timer()).toHaveStyle({ borderColor: theme.accent.toLowerCase() });
    });

    it('should not turn the border to the accent colour before it starts', async () => {
      await renderCountdown({ seconds: 2, startedAt: null }, themeName);

      expect(timer()).toHaveStyle({ borderColor: theme.border.toLowerCase() });
    });
  });
});
