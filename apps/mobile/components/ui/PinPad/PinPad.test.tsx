import { copy, fillCopy } from '@getfreak/content';
import { colorThemes } from '@getfreak/tokens';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';

import { renderWithMockFeedback } from '../../../feedback/renderWithMockFeedback';
import { hostViewsInside } from '../../../tailwind/hostViewsInside';
import { renderThemed } from '../../../tailwind/renderThemed';
import { PinPad } from './PinPad';
import type { PinPadProps } from './types';

const keyNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const dotsName = (count: number) => fillCopy(copy.pin.dots, { count, length: 4 });

// The shake is read from the phone's reduce motion setting, which answers after the first render.
async function renderPad(props: Partial<PinPadProps> = {}) {
  const onChange = jest.fn();
  const onComplete = jest.fn();
  await renderThemed(<PinPad value="" onChange={onChange} onComplete={onComplete} {...props} />);
  await act(async () => {});
  return { onChange, onComplete };
}

const key = (name: string) => screen.getByRole('button', { name });

// The dots are the plain views inside the one element that names them.
function dotStyles(count: number) {
  const dots = screen.getByRole('text', { name: dotsName(count) });
  return hostViewsInside(dots).map((dot) => StyleSheet.flatten(dot.props.style));
}

describe('PinPad', () => {
  beforeEach(() => {
    // React Native's own Jest setup already makes this a mock, so earlier calls are cleared.
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockClear()
      .mockImplementation(() => {});
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('the keys', () => {
    it.each(keyNames)('should have a button named %s', async (name) => {
      await renderPad();

      expect(key(name)).toBeOnTheScreen();
    });

    it('should have a Delete button', async () => {
      await renderPad({ value: '1' });

      expect(key(copy.pin.delete)).toBeOnTheScreen();
    });

    it('should add the pressed digit to the value', async () => {
      const { onChange } = await renderPad({ value: '12' });

      fireEvent.press(key('7'));

      expect(onChange).toHaveBeenCalledWith('127');
    });

    it('should not call onComplete before the last digit', async () => {
      const { onComplete } = await renderPad({ value: '12' });

      fireEvent.press(key('7'));

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should call onComplete with the whole PIN on the fourth digit', async () => {
      const { onChange, onComplete } = await renderPad({ value: '123' });

      fireEvent.press(key('4'));

      expect(onChange).toHaveBeenCalledWith('1234');
      expect(onComplete).toHaveBeenCalledWith('1234');
    });

    it('should take no more digits once the PIN is full', async () => {
      const { onChange, onComplete } = await renderPad({ value: '1234' });

      fireEvent.press(key('5'));

      expect(onChange).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should remove the last digit with Delete', async () => {
      const { onChange } = await renderPad({ value: '123' });

      fireEvent.press(key(copy.pin.delete));

      expect(onChange).toHaveBeenCalledWith('12');
    });

    it('should disable Delete while there is nothing to delete', async () => {
      const { onChange } = await renderPad({ value: '' });

      fireEvent.press(screen.getByRole('button', { name: copy.pin.delete, disabled: true }));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should give a press its tap feedback', async () => {
      const feedback = await renderWithMockFeedback(
        <PinPad value="" onChange={jest.fn()} onComplete={jest.fn()} />,
      );

      fireEvent.press(key('3'));

      expect(feedback.tap).toHaveBeenCalledTimes(1);
    });
  });

  describe('when disabled', () => {
    it('should expose every key as disabled', async () => {
      await renderPad({ value: '1', disabled: true });

      [...keyNames, copy.pin.delete].forEach((name) =>
        expect(screen.getByRole('button', { name, disabled: true })).toBeOnTheScreen(),
      );
    });

    it('should ignore presses', async () => {
      const { onChange, onComplete } = await renderPad({ value: '123', disabled: true });

      fireEvent.press(key('4'));
      fireEvent.press(key(copy.pin.delete));

      expect(onChange).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should dim the keys', async () => {
      await renderPad({ disabled: true });

      expect(key('5')).toHaveStyle({ opacity: 0.5 });
    });
  });

  describe('the dots', () => {
    it.each([0, 1, 2, 4])('should say how many digits are entered, %s of 4', async (count) => {
      await renderPad({ value: '1234'.slice(0, count) });

      expect(screen.getByRole('text', { name: dotsName(count) })).toBeOnTheScreen();
    });

    it('should be one polite live region, so a change is announced', async () => {
      await renderPad({ value: '12' });

      expect(screen.getByRole('text', { name: dotsName(2) }).props.accessibilityLiveRegion).toBe(
        'polite',
      );
    });

    it('should fill one dot for each digit in the accent colour', async () => {
      await renderPad({ value: '12' });

      const accent = colorThemes.light.accent.toLowerCase();
      expect(dotStyles(2).map((style) => style?.backgroundColor === accent)).toEqual([
        true,
        true,
        false,
        false,
      ]);
    });

    it('should leave the empty dots with a muted border', async () => {
      await renderPad({ value: '12' });

      expect(dotStyles(2)[3]?.borderColor).toBe(colorThemes.light.muted.toLowerCase());
    });

    it('should never put the digits in a name or a text', async () => {
      await renderPad({ value: '1357' });

      expect(screen.queryByLabelText(/1357/)).toBeNull();
      expect(screen.queryByText(/1357/)).toBeNull();
    });
  });

  describe('an error', () => {
    it('should show the line in the danger colour', async () => {
      await renderPad({ error: copy.lock.wrong });

      expect(screen.getByText(copy.lock.wrong)).toHaveStyle({
        color: colorThemes.light.danger.toLowerCase(),
      });
    });

    it('should turn every dot to the danger border and leave them empty', async () => {
      await renderPad({ value: '12', error: copy.lock.wrong });

      const styles = dotStyles(2);
      expect(styles).toHaveLength(4);
      styles.forEach((style) => {
        expect(style?.borderColor).toBe(colorThemes.light.danger.toLowerCase());
        expect(style?.backgroundColor).toBeUndefined();
      });
    });

    it('should announce the line when it appears', async () => {
      await renderPad({ error: copy.lock.wrong });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(copy.lock.wrong);
    });

    it('should not announce anything without an error', async () => {
      await renderPad();

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('should shake the dots', async () => {
      const sequence = jest.spyOn(Animated, 'sequence');

      await renderPad({ error: copy.lock.wrong });

      expect(sequence).toHaveBeenCalledTimes(1);
    });

    it('should not shake the dots with reduce motion on', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      const sequence = jest.spyOn(Animated, 'sequence');

      await renderPad({ error: copy.lock.wrong });

      expect(sequence).not.toHaveBeenCalled();
    });
  });

  describe('a message', () => {
    it('should show the line in the muted colour', async () => {
      await renderPad({ message: 'Try again in 0:24.' });

      expect(screen.getByText('Try again in 0:24.')).toHaveStyle({
        color: colorThemes.light.muted.toLowerCase(),
      });
    });

    it('should not announce the line, because the screen decides how often', async () => {
      await renderPad({ message: 'Try again in 0:24.' });

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('should keep the dots as they are', async () => {
      await renderPad({ message: 'Try again in 0:24.' });

      dotStyles(0).forEach((style) =>
        expect(style?.borderColor).toBe(colorThemes.light.muted.toLowerCase()),
      );
    });
  });
});
