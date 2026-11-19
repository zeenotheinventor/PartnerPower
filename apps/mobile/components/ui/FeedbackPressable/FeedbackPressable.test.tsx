import { fireEvent, screen } from 'nativewind/test';
import { Text } from 'react-native';

import { createMockFeedback } from '../../../feedback/createMockFeedback';
import { FeedbackContext } from '../../../feedback/FeedbackProvider';
import { renderThemed } from '../../../tailwind/renderThemed';
import { FeedbackPressable } from './FeedbackPressable';
import type { FeedbackPressableProps } from './types';

async function renderPressable(props: Partial<FeedbackPressableProps> = {}) {
  const feedback = createMockFeedback();
  const onPress = jest.fn();
  await renderThemed(
    <FeedbackContext.Provider value={feedback}>
      <FeedbackPressable
        accessibilityRole="button"
        accessibilityLabel="Go"
        onPress={onPress}
        {...props}
      >
        <Text>Go</Text>
      </FeedbackPressable>
    </FeedbackContext.Provider>,
  );
  return { feedback, onPress };
}

const press = () => fireEvent.press(screen.getByRole('button', { name: 'Go' }));

describe('FeedbackPressable', () => {
  it('should give the ordinary tap and run the action when pressed', async () => {
    const { feedback, onPress } = await renderPressable();

    press();

    expect(feedback.tap).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['done', 'pass', 'toggleOn', 'toggleOff', 'select', 'back'] as const)(
    'should give the %s feedback when asked',
    async (moment) => {
      const { feedback } = await renderPressable({ feedback: moment });

      press();

      expect(feedback[moment]).toHaveBeenCalledTimes(1);
      expect(feedback.tap).not.toHaveBeenCalled();
    },
  );

  it('should give no feedback and still run the action when asked for none', async () => {
    const { feedback, onPress } = await renderPressable({ feedback: 'none' });

    press();

    expect(feedback.tap).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should ask for the feedback before running the action', async () => {
    const order: string[] = [];
    const { feedback, onPress } = await renderPressable();
    feedback.tap.mockImplementation(() => order.push('feedback'));
    onPress.mockImplementation(() => order.push('action'));

    press();

    expect(order).toEqual(['feedback', 'action']);
  });

  describe('when disabled', () => {
    it('should give the locked feedback and nothing else', async () => {
      const { feedback, onPress } = await renderPressable({ disabled: true });

      press();

      expect(feedback.locked).toHaveBeenCalledTimes(1);
      expect(feedback.tap).not.toHaveBeenCalled();
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should stay silent when its feedback is none', async () => {
      const { feedback } = await renderPressable({ disabled: true, feedback: 'none' });

      press();

      expect(feedback.locked).not.toHaveBeenCalled();
    });

    it('should still be announced as disabled', async () => {
      await renderPressable({ disabled: true });

      expect(screen.getByRole('button', { name: 'Go', disabled: true })).toBeOnTheScreen();
    });

    it('should keep the other accessibility state it was given', async () => {
      await renderPressable({ disabled: true, accessibilityState: { selected: true } });

      expect(
        screen.getByRole('button', { name: 'Go', disabled: true, selected: true }),
      ).toBeOnTheScreen();
    });
  });

  it('should not accept the other press handlers, which a disabled control could fire through', () => {
    const props: FeedbackPressableProps = {
      onPress: jest.fn(),
      // @ts-expect-error A long press would bypass the disabled check.
      onLongPress: jest.fn(),
    };
    const pressInProps: FeedbackPressableProps = {
      onPress: jest.fn(),
      // @ts-expect-error A press in would bypass the disabled check.
      onPressIn: jest.fn(),
    };
    const pressOutProps: FeedbackPressableProps = {
      onPress: jest.fn(),
      // @ts-expect-error A press out would bypass the disabled check.
      onPressOut: jest.fn(),
    };

    expect([props, pressInProps, pressOutProps]).toHaveLength(3);
  });

  it('should not be announced as disabled when it is not', async () => {
    await renderPressable();

    expect(screen.getByRole('button', { name: 'Go', disabled: false })).toBeOnTheScreen();
  });
});
