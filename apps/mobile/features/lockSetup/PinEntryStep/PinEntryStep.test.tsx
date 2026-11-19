import { copy, fillCopy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo, Text } from 'react-native';

import { changeAppState, fakeAppState } from '../../../lock/testing/fakeAppState';
import { renderThemed } from '../../../tailwind/renderThemed';
import { PinEntryStep } from './PinEntryStep';
import type { PinEntryStepProps } from './types';

const dotsName = (count: number) => fillCopy(copy.pin.dots, { count, length: 4 });

async function renderStep(props: Partial<PinEntryStepProps> = {}) {
  const onSubmit = jest.fn<Promise<string | undefined>, [string]>(() => Promise.resolve(undefined));
  await renderThemed(<PinEntryStep title="Choose a PIN" onSubmit={onSubmit} {...props} />);
  await act(async () => {});
  return { onSubmit };
}

function typeDigits(digits: string) {
  [...digits].forEach((digit) => fireEvent.press(screen.getByRole('button', { name: digit })));
}

async function advance(milliseconds: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

describe('PinEntryStep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fakeAppState();
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockClear()
      .mockImplementation(() => {});
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should show its title as the heading and its subtitle', async () => {
    await renderStep({ subtitle: '4 digits you will remember.' });

    expect(screen.getByRole('header', { name: 'Choose a PIN' })).toBeOnTheScreen();
    expect(screen.getByText('4 digits you will remember.')).toBeOnTheScreen();
  });

  it('should have no back button when it is not told what to do', async () => {
    await renderStep();

    expect(screen.queryByRole('button', { name: copy.lockSetup.backLabel })).toBeNull();
  });

  it('should go back when the back button is pressed', async () => {
    const onBack = jest.fn();
    await renderStep({ onBack });
    fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.backLabel }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should show the digits typed as a count on the dots', async () => {
    await renderStep();

    typeDigits('12');

    expect(screen.getByRole('text', { name: dotsName(2) })).toBeOnTheScreen();
  });

  it('should hold the full dots for a moment before it submits, so they are seen', async () => {
    const { onSubmit } = await renderStep();

    typeDigits('1234');

    expect(screen.getByRole('text', { name: dotsName(4) })).toBeOnTheScreen();
    await advance(149);
    expect(onSubmit).not.toHaveBeenCalled();
    await advance(1);
    expect(onSubmit).toHaveBeenCalledWith('1234');
  });

  it('should clear the dots once the submit has answered', async () => {
    await renderStep();

    typeDigits('1234');
    await advance(150);

    expect(screen.getByRole('text', { name: dotsName(0) })).toBeOnTheScreen();
  });

  it('should ignore Delete while the full dots are held', async () => {
    const { onSubmit } = await renderStep();
    typeDigits('1234');

    fireEvent.press(screen.getByRole('button', { name: copy.pin.delete }));
    await advance(150);

    expect(onSubmit).toHaveBeenCalledWith('1234');
  });

  it('should show the error line the submit answers with, and clear it when typing starts again', async () => {
    await renderStep({ onSubmit: jest.fn(() => Promise.resolve(copy.lock.wrong)) });

    typeDigits('1234');
    await advance(150);
    expect(screen.getByText(copy.lock.wrong)).toBeOnTheScreen();

    typeDigits('1');

    expect(screen.queryByText(copy.lock.wrong)).toBeNull();
  });

  it('should announce the same error again when it comes a second time', async () => {
    await renderStep({ onSubmit: jest.fn(() => Promise.resolve(copy.lock.wrong)) });

    typeDigits('1234');
    await advance(150);
    typeDigits('1234');
    await advance(150);

    const announced = jest.mocked(AccessibilityInfo.announceForAccessibility).mock.calls;
    expect(announced.filter(([line]) => line === copy.lock.wrong)).toHaveLength(2);
  });

  it('should show the error it was given from the start', async () => {
    await renderStep({ initialError: copy.lockSetup.mismatch });

    expect(screen.getByText(copy.lockSetup.mismatch)).toBeOnTheScreen();
  });

  it('should show the save failed line and clear the dots when the submit rejects', async () => {
    await renderStep({ onSubmit: jest.fn(() => Promise.reject(new Error('Storage failed'))) });

    typeDigits('1234');
    await advance(150);

    expect(screen.getByText(copy.lock.saveFailed)).toBeOnTheScreen();
    expect(screen.getByRole('text', { name: dotsName(0) })).toBeOnTheScreen();
  });

  it('should show a neutral line and disable the keys when it is waiting', async () => {
    await renderStep({ message: 'Too many tries. Try again in 0:30.', disabled: true });

    expect(screen.getByText('Too many tries. Try again in 0:30.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '1', disabled: true })).toBeOnTheScreen();
  });

  it('should show what it is given under the keypad', async () => {
    await renderStep({ below: <Text>Under the keypad</Text> });

    expect(screen.getByText('Under the keypad')).toBeOnTheScreen();
  });

  it('should stop its timer when it is unmounted before the hold ends', async () => {
    const { onSubmit } = await renderStep();
    typeDigits('1234');

    screen.unmount();
    await advance(500);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe('leaving the app', () => {
    it('should forget the numbers typed so far', async () => {
      await renderStep();
      typeDigits('12');

      await changeAppState('background');

      expect(screen.getByRole('text', { name: dotsName(0) })).toBeOnTheScreen();
    });

    it('should drop the held last number, so nothing is submitted', async () => {
      const { onSubmit } = await renderStep();
      typeDigits('1234');

      await changeAppState('inactive');
      await advance(500);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole('text', { name: dotsName(0) })).toBeOnTheScreen();
    });

    it('should take a new PIN after coming back', async () => {
      const { onSubmit } = await renderStep();
      typeDigits('1234');
      await changeAppState('background');

      typeDigits('5678');
      await advance(200);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('5678');
    });
  });

  it('should submit once when the last number is pressed twice in one frame', async () => {
    const { onSubmit } = await renderStep();
    typeDigits('123');

    // Both presses see the same three numbers, as two touches in one frame would.
    act(() => {
      fireEvent.press(screen.getByRole('button', { name: '4' }));
      fireEvent.press(screen.getByRole('button', { name: '4' }));
    });
    await advance(500);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
