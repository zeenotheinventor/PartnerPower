import { colorThemes } from '@getfreak/tokens';
import { act, fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo, Platform } from 'react-native';

import { hostViewInside } from '../../../tailwind/hostViewsInside';
import { renderThemed } from '../../../tailwind/renderThemed';
import { Toast } from './Toast';

const themeNames = ['light', 'dark'] as const;
const message = 'Updated.';
const dismissHint = 'Tap to dismiss';

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

function toastRole() {
  return screen.getByRole('button', { name: message });
}

const mountedToasts: Array<{ unmount: () => void }> = [];

type ReduceMotionAnswer = boolean | 'fails';
let answerReduceMotion: (answer: ReduceMotionAnswer) => void = () => {};

// The reduce motion setting is read asynchronously. The test answers it inside an act, once the
// toast has rendered, so the toast's update is not outside one.
async function renderToast({
  onDismiss = jest.fn(),
  themeName = 'light',
  reduceMotion = false,
}: {
  onDismiss?: jest.Mock;
  themeName?: (typeof themeNames)[number];
  reduceMotion?: ReduceMotionAnswer;
} = {}) {
  const rendered = await renderThemed(
    <Toast message={message} dismissHint={dismissHint} onDismiss={onDismiss} />,
    themeName,
  );
  mountedToasts.push(rendered);
  await act(async () => answerReduceMotion(reduceMotion));
  return { rendered, onDismiss };
}

async function advance(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          answerReduceMotion = (answer) =>
            answer === 'fails' ? reject(new Error('unavailable')) : resolve(answer);
        }),
    );
    // React Native's own Jest setup already makes this a mock, so earlier calls are cleared.
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockClear()
      .mockImplementation(() => {});
  });

  afterEach(() => {
    mountedToasts.splice(0).forEach((toast) => toast.unmount());
    jest.useRealTimers();
    jest.restoreAllMocks();
    setPlatform('ios');
  });

  it('should be a button named by its message, with the dismiss hint', async () => {
    await renderToast();

    expect(toastRole().props.accessibilityHint).toBe(dismissHint);
    expect(screen.getByText(message)).toBeOnTheScreen();
  });

  it('should be a polite live region', async () => {
    await renderToast();

    expect(toastRole()).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  it('should announce its message on iOS', async () => {
    setPlatform('ios');
    await renderToast();

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(message);
  });

  it('should leave the announcement to the live region on Android', async () => {
    setPlatform('android');
    await renderToast();

    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('should not block the screen behind it', async () => {
    const { rendered } = await renderToast();

    expect(rendered.toJSON()).toHaveProperty('props.pointerEvents', 'box-none');
  });

  it('should still be showing just before 3 seconds have passed', async () => {
    const { onDismiss } = await renderToast();

    await advance(2900);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should dismiss itself after about 3 seconds', async () => {
    const { onDismiss } = await renderToast();

    await advance(3600);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should dismiss when tapped, once', async () => {
    const { onDismiss } = await renderToast();

    fireEvent.press(toastRole());
    fireEvent.press(toastRole());
    await advance(600);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not dismiss a second time when the time runs out after a tap', async () => {
    const { onDismiss } = await renderToast();

    fireEvent.press(toastRole());
    await advance(10_000);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  describe('with reduce motion on', () => {
    it('should appear at once, with no fade', async () => {
      await renderToast({ reduceMotion: true });

      // The fading view is the second plain view inside the toast, after the one that holds it.
      expect(hostViewInside(screen.root, 1)).toHaveStyle({ opacity: 1 });
    });

    it('should disappear at exactly 3 seconds, with no fade', async () => {
      const { onDismiss } = await renderToast({ reduceMotion: true });

      await advance(2999);
      expect(onDismiss).not.toHaveBeenCalled();
      await advance(1);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should disappear at once when tapped', async () => {
      const { onDismiss } = await renderToast({ reduceMotion: true });

      fireEvent.press(toastRole());
      await advance(0);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('should treat a failed reduce motion check as motion allowed', async () => {
    const { onDismiss } = await renderToast({ reduceMotion: 'fails' });

    await advance(3600);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should draw a surface with a 2 border, rounded, with 12 by 16 padding', async () => {
      await renderToast({ themeName });

      expect(toastRole()).toHaveStyle({
        backgroundColor: theme.surface.toLowerCase(),
        borderColor: theme.border.toLowerCase(),
        borderWidth: 2,
        borderRadius: 24,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
      });
    });

    it('should set the message in the foreground colour', async () => {
      await renderToast({ themeName });

      expect(screen.getByText(message)).toHaveStyle({ color: theme.foreground.toLowerCase() });
    });
  });
});
