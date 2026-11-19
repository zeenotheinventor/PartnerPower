import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';
import { StyleSheet } from 'react-native';

import { createMockFeedback } from '../../../feedback/createMockFeedback';
import { FeedbackContext } from '../../../feedback/FeedbackProvider';
import { hostViewsInside } from '../../../tailwind/hostViewsInside';
import { renderThemed } from '../../../tailwind/renderThemed';
import { Button } from './Button';

const themeNames = ['light', 'dark'] as const;

function downwardShift(element: ReturnType<typeof screen.getByText>): number {
  const transforms: Array<{ translateY?: number }> =
    StyleSheet.flatten(element.props.style).transform ?? [];
  return transforms.find((transform) => transform.translateY !== undefined)?.translateY ?? 0;
}

// The depth edge is the first view inside the button.
function edgeOf(button: ReturnType<typeof screen.getByRole>) {
  const [edge] = hostViewsInside(button);
  return edge;
}

describe('Button', () => {
  it('should be a button named by its label', async () => {
    await renderThemed(<Button label="Continue" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  it('should call the handler when pressed', async () => {
    const onPress = jest.fn();
    await renderThemed(<Button label="Continue" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call the handler when disabled', async () => {
    const onPress = jest.fn();
    await renderThemed(<Button label="Continue" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('should expose the disabled state', async () => {
    await renderThemed(<Button label="Continue" onPress={jest.fn()} disabled />);

    expect(screen.getByRole('button', { name: 'Continue', disabled: true })).toBeOnTheScreen();
  });

  it('should dim itself when disabled', async () => {
    await renderThemed(<Button label="Continue" onPress={jest.fn()} disabled />);

    expect(screen.getByRole('button', { name: 'Continue' })).toHaveStyle({ opacity: 0.5 });
  });

  it('should stretch to the full width when asked', async () => {
    await renderThemed(<Button label="Continue" onPress={jest.fn()} fullWidth />);

    expect(screen.getByRole('button', { name: 'Continue' })).toHaveStyle({ width: '100%' });
  });

  it('should sink the face onto its edge while pressed', async () => {
    await renderThemed(<Button label="Continue" onPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Continue' });
    const face = screen.getByText('Continue');

    expect(downwardShift(face)).toBe(0);
    fireEvent(button, 'pressIn');
    expect(downwardShift(face)).toBe(4);
    fireEvent(button, 'pressOut');
    expect(downwardShift(face)).toBe(0);
  });

  it('should place the edge under the face and leave the button itself without a fill', async () => {
    await renderThemed(<Button label="Continue" onPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Continue' });

    expect(edgeOf(button)).toHaveStyle({ position: 'absolute', top: 4, bottom: 0 });
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBeUndefined();
  });

  describe('press feedback', () => {
    async function renderWithFeedback(button: React.ReactElement) {
      const feedback = createMockFeedback();
      await renderThemed(
        <FeedbackContext.Provider value={feedback}>{button}</FeedbackContext.Provider>,
      );
      return feedback;
    }

    it('should ask for the default tap when pressed', async () => {
      const feedback = await renderWithFeedback(<Button label="Continue" onPress={jest.fn()} />);

      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

      expect(feedback.tap).toHaveBeenCalledTimes(1);
      expect(feedback.done).not.toHaveBeenCalled();
      expect(feedback.pass).not.toHaveBeenCalled();
    });

    it.each(['done', 'pass'] as const)('should ask for %s when named', async (moment) => {
      const feedback = await renderWithFeedback(
        <Button label="Continue" feedback={moment} onPress={jest.fn()} />,
      );

      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

      expect(feedback[moment]).toHaveBeenCalledTimes(1);
      expect(feedback.tap).not.toHaveBeenCalled();
    });

    it('should ask for nothing when it opts out', async () => {
      const onPress = jest.fn();
      const feedback = await renderWithFeedback(
        <Button label="Continue" feedback="none" onPress={onPress} />,
      );

      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(feedback.tap).not.toHaveBeenCalled();
      expect(feedback.done).not.toHaveBeenCalled();
      expect(feedback.pass).not.toHaveBeenCalled();
    });

    it('should ask for nothing when disabled', async () => {
      const feedback = await renderWithFeedback(
        <Button label="Continue" disabled onPress={jest.fn()} />,
      );

      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

      expect(feedback.tap).not.toHaveBeenCalled();
    });

    it('should ask for the feedback before running the action, and still run it', async () => {
      const order: string[] = [];
      const feedback = createMockFeedback();
      feedback.tap.mockImplementation(() => order.push('feedback'));
      await renderThemed(
        <FeedbackContext.Provider value={feedback}>
          <Button label="Continue" onPress={() => order.push('action')} />
        </FeedbackContext.Provider>,
      );

      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

      expect(order).toEqual(['feedback', 'action']);
    });

    it('should press quietly with no provider', async () => {
      const onPress = jest.fn();
      await renderThemed(<Button label="Continue" onPress={onPress} />);

      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should fill the primary face with the accent on a deeper accent edge', async () => {
      await renderThemed(<Button label="Continue" onPress={jest.fn()} />, themeName);

      expect(screen.getByText('Continue')).toHaveStyle({
        backgroundColor: theme.accent.toLowerCase(),
      });
      expect(edgeOf(screen.getByRole('button', { name: 'Continue' }))).toHaveStyle({
        backgroundColor: theme.accentDeep.toLowerCase(),
      });
    });

    it('should set the primary label in the on-accent colour', async () => {
      await renderThemed(<Button label="Continue" onPress={jest.fn()} />, themeName);

      expect(screen.getByText('Continue')).toHaveStyle({ color: theme.onAccent.toLowerCase() });
    });

    it('should fill the secondary face with the surface on a border coloured edge', async () => {
      await renderThemed(
        <Button label="Back" variant="secondary" onPress={jest.fn()} />,
        themeName,
      );

      expect(screen.getByText('Back')).toHaveStyle({
        backgroundColor: theme.surface.toLowerCase(),
        borderColor: theme.border.toLowerCase(),
      });
      expect(edgeOf(screen.getByRole('button', { name: 'Back' }))).toHaveStyle({
        backgroundColor: theme.border.toLowerCase(),
      });
    });

    it('should set the secondary label in the foreground colour', async () => {
      await renderThemed(
        <Button label="Back" variant="secondary" onPress={jest.fn()} />,
        themeName,
      );

      expect(screen.getByText('Back')).toHaveStyle({ color: theme.foreground.toLowerCase() });
    });
  });
});
