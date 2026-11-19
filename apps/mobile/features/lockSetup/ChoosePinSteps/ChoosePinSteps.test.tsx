import { copy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { ChoosePinSteps } from './ChoosePinSteps';
import type { ChoosePinStepsProps } from './types';

async function renderSteps(props: Partial<ChoosePinStepsProps> = {}) {
  const onBack = jest.fn();
  const onChosen = jest.fn<Promise<string | undefined>, [string]>(() => Promise.resolve(undefined));
  await renderThemed(
    <ChoosePinSteps
      enterTitle={copy.lockSetup.enterTitle}
      onBack={onBack}
      onChosen={onChosen}
      {...props}
    />,
  );
  await act(async () => {});
  return { onBack, onChosen };
}

async function typePin(pin: string) {
  [...pin].forEach((digit) => fireEvent.press(screen.getByRole('button', { name: digit })));
  // The fourth dot is held for a moment, then the step moves on.
  await act(async () => {
    await jest.advanceTimersByTimeAsync(200);
  });
}

const heading = (name: string) => screen.getByRole('header', { name });

describe('ChoosePinSteps', () => {
  beforeEach(() => {
    jest.useFakeTimers();
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

  it('should start by asking for a PIN, with its subtitle', async () => {
    await renderSteps();

    expect(heading(copy.lockSetup.enterTitle)).toBeOnTheScreen();
    expect(screen.getByText(copy.lockSetup.enterSubtitle)).toBeOnTheScreen();
  });

  it('should use the heading it is given for the first step', async () => {
    await renderSteps({ enterTitle: copy.lockSettings.newTitle });

    expect(heading(copy.lockSettings.newTitle)).toBeOnTheScreen();
  });

  it('should ask for the PIN again after it is typed', async () => {
    await renderSteps();

    await typePin('4821');

    expect(heading(copy.lockSetup.confirmTitle)).toBeOnTheScreen();
    expect(screen.getByText(copy.lockSetup.confirmSubtitle)).toBeOnTheScreen();
  });

  it('should hand over the PIN when it is typed twice the same', async () => {
    const { onChosen } = await renderSteps();

    await typePin('4821');
    expect(onChosen).not.toHaveBeenCalled();
    await typePin('4821');

    expect(onChosen).toHaveBeenCalledTimes(1);
    expect(onChosen).toHaveBeenCalledWith('4821');
  });

  describe('when the second PIN is different', () => {
    it('should show the error and start again at the first step', async () => {
      const { onChosen } = await renderSteps();

      await typePin('4821');
      await typePin('4822');

      expect(heading(copy.lockSetup.enterTitle)).toBeOnTheScreen();
      expect(screen.getByText(copy.lockSetup.mismatch)).toBeOnTheScreen();
      expect(onChosen).not.toHaveBeenCalled();
    });

    it('should announce the error', async () => {
      await renderSteps();

      await typePin('4821');
      await typePin('4822');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        copy.lockSetup.mismatch,
      );
    });

    it('should forget the first PIN, so the new first PIN is compared with the next one only', async () => {
      const { onChosen } = await renderSteps();
      await typePin('4821');
      await typePin('4822');

      // The old first PIN is typed as the new second one, and it does not count as a match.
      await typePin('1357');
      await typePin('4821');
      expect(onChosen).not.toHaveBeenCalled();

      await typePin('1357');
      await typePin('1357');
      expect(onChosen).toHaveBeenCalledTimes(1);
      expect(onChosen).toHaveBeenCalledWith('1357');
    });

    it('should start with empty dots', async () => {
      await renderSteps();
      await typePin('4821');
      await typePin('4822');

      expect(screen.getByRole('text', { name: '0 of 4 digits entered' })).toBeOnTheScreen();
    });
  });

  describe('going back', () => {
    it('should leave the flow from the first step', async () => {
      const { onBack } = await renderSteps();

      fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.backLabel }));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should go from the second step to the first, with no error and empty dots', async () => {
      const { onBack } = await renderSteps();
      await typePin('4821');

      fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.backLabel }));

      expect(onBack).not.toHaveBeenCalled();
      expect(heading(copy.lockSetup.enterTitle)).toBeOnTheScreen();
      expect(screen.queryByText(copy.lockSetup.mismatch)).toBeNull();
      expect(screen.getByRole('text', { name: '0 of 4 digits entered' })).toBeOnTheScreen();
    });
  });

  it('should show the error line the flow answers with, on the second step', async () => {
    await renderSteps({ onChosen: () => Promise.resolve(copy.lock.saveFailed) });

    await typePin('4821');
    await typePin('4821');

    expect(heading(copy.lockSetup.confirmTitle)).toBeOnTheScreen();
    expect(screen.getByText(copy.lock.saveFailed)).toBeOnTheScreen();
  });
});
