import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen, within } from 'nativewind/test';
import { KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { Button } from '../Button';
import { Header } from '../Header';
import { Screen } from './Screen';

const themeNames = ['light', 'dark'] as const;

// A screen is a layout container with no accessibility role of its own. A screen's name comes
// from the heading of its header, so these tests find the content by role.
function renderScreenContent(scroll: boolean, themeName: 'light' | 'dark' = 'light') {
  return renderThemed(
    <Screen scroll={scroll}>
      <Header title="Set the round" />
      <Button label="Continue" onPress={jest.fn()} />
    </Screen>,
    themeName,
  );
}

describe('Screen', () => {
  it.each([false, true])('should show its content with scroll %s', async (scroll) => {
    await renderScreenContent(scroll);

    expect(screen.getByRole('header', { name: 'Set the round' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  it('should let its content be pressed', async () => {
    const onPress = jest.fn();
    await renderThemed(
      <Screen>
        <Button label="Continue" onPress={onPress} />
      </Screen>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  describe('keyboard avoidance', () => {
    it('should not wrap its content in a keyboard avoiding view by default', async () => {
      await renderScreenContent(true);

      // React Native has no role or label to find this view by, so it is found by its type.
      expect(screen.UNSAFE_queryByType(KeyboardAvoidingView)).toBeNull();
    });

    it('should wrap its content in a keyboard avoiding view that pads for the keyboard', async () => {
      await renderThemed(
        <Screen scroll avoidKeyboard>
          <Button label="Continue" onPress={jest.fn()} />
        </Screen>,
      );

      const avoidingView = screen.UNSAFE_getByType(KeyboardAvoidingView);
      expect(avoidingView.props.behavior).toBe('padding');
      expect(avoidingView.findByType(ScrollView)).toBeTruthy();
    });

    it('should still let its content be pressed', async () => {
      const onPress = jest.fn();
      await renderThemed(
        <Screen scroll avoidKeyboard>
          <Button label="Continue" onPress={onPress} />
        </Screen>,
      );

      fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  it('should not scroll by default', async () => {
    await renderScreenContent(false);

    // React Native has no role or label to find a scroll view by, so this uses its type.
    expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull();
  });

  describe('when it scrolls', () => {
    it('should keep taps working while the keyboard is open', async () => {
      await renderScreenContent(true);

      expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
    });

    it('should pad the content 16 below the top of the safe area', async () => {
      await renderScreenContent(true);

      const contentStyles = screen
        .UNSAFE_getByType(ScrollView)
        .findAll((node) => node.props.contentContainerStyle !== undefined)
        .map((node) => StyleSheet.flatten(node.props.contentContainerStyle));
      expect(contentStyles.map((style) => style.paddingTop)).toContain(16);
    });
  });

  describe('a footer', () => {
    it('should show the footer outside the scrolling content, after it', async () => {
      await renderThemed(
        <Screen scroll footer={<Button label="Save" onPress={jest.fn()} />}>
          <Header title="Editor" />
        </Screen>,
      );

      const scrollView = screen.UNSAFE_getByType(ScrollView);
      expect(within(scrollView).queryByRole('button', { name: 'Save' })).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
    });

    it('should ride above the keyboard when the screen avoids it', async () => {
      await renderThemed(
        <Screen scroll avoidKeyboard footer={<Button label="Save" onPress={jest.fn()} />}>
          <Header title="Editor" />
        </Screen>,
      );

      const avoidingView = screen.UNSAFE_getByType(KeyboardAvoidingView);
      expect(within(avoidingView).getByRole('button', { name: 'Save' })).toBeOnTheScreen();
    });

    it('should be pressable', async () => {
      const onPress = jest.fn();
      await renderThemed(
        <Screen footer={<Button label="Save" onPress={onPress} />}>
          <Header title="Editor" />
        </Screen>,
      );

      fireEvent.press(screen.getByRole('button', { name: 'Save' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it.each(themeNames)(
      'should sit on a border line over the background in %s mode',
      async (themeName) => {
        await renderThemed(
          <Screen footer={<Button label="Save" onPress={jest.fn()} />}>
            <Header title="Editor" />
          </Screen>,
          themeName,
        );

        // The footer has no role, so it is the nearest view above the button that has a top border.
        let footer: ReturnType<typeof screen.getByRole> | null = screen.getByRole('button', {
          name: 'Save',
        }).parent;
        while (footer && StyleSheet.flatten(footer.props.style)?.borderTopWidth !== 2) {
          footer = footer.parent;
        }
        expect(footer).toHaveStyle({
          borderColor: colorThemes[themeName].border.toLowerCase(),
          backgroundColor: colorThemes[themeName].background.toLowerCase(),
        });
      },
    );
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    it('should draw the theme background', async () => {
      await renderScreenContent(false, themeName);

      expect(screen.root).toHaveStyle({
        backgroundColor: colorThemes[themeName].background.toLowerCase(),
      });
    });
  });
});
