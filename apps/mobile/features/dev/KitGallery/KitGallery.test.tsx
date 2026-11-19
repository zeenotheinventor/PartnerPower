import { characterNames } from '@getfreak/content';
import { characterIds } from '@getfreak/core';
import { act, fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { KitGallery } from './KitGallery';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

describe('KitGallery', () => {
  it('should be a screen with a heading', async () => {
    await renderThemed(<KitGallery />);

    expect(screen.getByRole('header', { name: 'UI kit' })).toBeOnTheScreen();
  });

  it.each(['button', 'switch', 'group', 'image', 'radio'] as const)(
    'should show at least one %s',
    async (role) => {
      await renderThemed(<KitGallery />);

      expect(screen.getAllByRole(role).length).toBeGreaterThan(0);
    },
  );

  it('should show a text field', async () => {
    await renderThemed(<KitGallery />);

    expect(screen.getByLabelText('Text field')).toBeOnTheScreen();
  });

  it('should show a segmented control that checks the option that is pressed', async () => {
    await renderThemed(<KitGallery />);
    expect(screen.getByRole('radio', { name: 'Option B', checked: true })).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('radio', { name: 'Option C' }));

    expect(screen.getByRole('radio', { name: 'Option C', checked: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Option B', checked: false })).toBeOnTheScreen();
  });

  it('should show category toggles that switch, and a locked one that does not', async () => {
    await renderThemed(<KitGallery />);

    fireEvent.press(screen.getByRole('switch', { name: 'Category on' }));
    expect(screen.getByRole('switch', { name: 'Category on', checked: false })).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('switch', { name: 'Category locked' }));
    expect(
      screen.getByRole('switch', { name: 'Category locked', checked: true, disabled: true }),
    ).toBeOnTheScreen();
  });

  it('should show a favourite toggle in both states, and turn the off one on when pressed', async () => {
    await renderThemed(<KitGallery />);
    expect(screen.getAllByRole('switch', { name: 'Favourite', checked: true })).toHaveLength(1);

    fireEvent.press(screen.getByRole('switch', { name: 'Favourite', checked: false }));

    expect(screen.getAllByRole('switch', { name: 'Favourite', checked: true })).toHaveLength(2);
  });

  it('should show selectable cards that select when pressed, and one that cannot be pressed', async () => {
    await renderThemed(<KitGallery />);
    expect(screen.getByRole('button', { name: 'Choice one', selected: false })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Choice two', selected: true })).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Choice one' }));

    expect(screen.getByRole('button', { name: 'Choice one', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Choice two', selected: false })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Choice, disabled', selected: false, disabled: true }),
    ).toBeOnTheScreen();
  });

  it('should show a locked switch that stays on and says why', async () => {
    await renderThemed(<KitGallery />);

    fireEvent.press(screen.getByRole('switch', { name: 'Switch, locked' }));

    const lockedSwitch = screen.getByRole('switch', {
      name: 'Switch, locked',
      checked: true,
      disabled: true,
    });
    expect(lockedSwitch).toHaveProp('accessibilityHint', 'One switch has to stay on.');
  });

  it('should show a pressable card and a disabled one', async () => {
    await renderThemed(<KitGallery />);

    expect(screen.getByRole('button', { name: 'Pressable card' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Disabled card', disabled: true })).toBeOnTheScreen();
  });

  it('should show an accent card and an accent chip', async () => {
    await renderThemed(<KitGallery />);

    expect(screen.getByRole('group', { name: /Accent card/ })).toBeOnTheScreen();
    expect(screen.getByRole('text', { name: 'Accent chip' })).toBeOnTheScreen();
  });

  it('should show a face down card named by its label', async () => {
    await renderThemed(<KitGallery />);

    expect(screen.getByRole('img', { name: 'Face down card' })).toBeOnTheScreen();
  });

  describe('the countdowns', () => {
    afterEach(() => jest.useRealTimers());

    it('should show one that has not started and one that has ended', async () => {
      await renderThemed(<KitGallery />);

      expect(screen.getByRole('timer', { name: 'Countdown, idle' })).toHaveAccessibilityValue({
        text: '60 seconds',
      });
      expect(screen.getByRole('timer', { name: 'Countdown, ended' })).toHaveAccessibilityValue({
        text: '0 seconds',
      });
    });

    it('should run a live one from ten seconds when it is started, and again when started again', async () => {
      jest.useFakeTimers();
      await renderThemed(<KitGallery />);
      const live = () => screen.getByRole('timer', { name: 'Countdown, live' });
      expect(live()).toHaveAccessibilityValue({ text: '10 seconds' });

      fireEvent.press(screen.getByRole('button', { name: 'Start the live countdown' }));
      await act(async () => jest.advanceTimersByTime(4_000));
      expect(live()).toHaveAccessibilityValue({ text: '6 seconds' });

      fireEvent.press(screen.getByRole('button', { name: 'Start the live countdown' }));
      await act(async () => jest.advanceTimersByTime(1_000));
      expect(live()).toHaveAccessibilityValue({ text: '9 seconds' });
    });
  });

  it('should show a toast when asked, and not before', async () => {
    await renderThemed(<KitGallery />);
    expect(screen.queryByRole('button', { name: 'Toast message' })).not.toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Show toast' }));

    // The toast reads the reduce motion setting asynchronously, so the test waits for it to settle.
    expect(await screen.findByRole('button', { name: 'Toast message' })).toBeOnTheScreen();
    await act(async () => {});
  });

  it('should go back from the header', async () => {
    await renderThemed(<KitGallery />);

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  describe('the multiline text field', () => {
    it('should show a multiline field with the count against its maximum', async () => {
      await renderThemed(<KitGallery />);

      expect(screen.getByLabelText('Multiline text field')).toHaveProp('multiline', true);
      expect(screen.getByText('0/140', { includeHiddenElements: true })).toBeOnTheScreen();
    });

    it('should count what is typed, and show the error when over the maximum', async () => {
      await renderThemed(<KitGallery />);

      fireEvent.changeText(screen.getByLabelText('Multiline text field'), 'x'.repeat(141));

      expect(screen.getByText('141/140', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(
        screen.getByText('Keep it to 140 characters.', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });
  });

  it('should show a danger button', async () => {
    await renderThemed(<KitGallery />);

    expect(screen.getByRole('button', { name: 'Danger button' })).toBeOnTheScreen();
  });

  describe('the PIN pad', () => {
    it('should show it empty, partly filled, full, with an error and while waiting', async () => {
      await renderThemed(<KitGallery />);

      // The empty one is the pad to try, so two pads are empty: that one and the waiting one.
      expect(screen.getAllByRole('text', { name: '0 of 4 digits entered' })).toHaveLength(3);
      expect(screen.getByRole('text', { name: '2 of 4 digits entered' })).toBeOnTheScreen();
      expect(screen.getByRole('text', { name: '4 of 4 digits entered' })).toBeOnTheScreen();
      expect(screen.getByText('Wrong PIN. Try again.')).toBeOnTheScreen();
      expect(screen.getByText('Try again in 0:24.')).toBeOnTheScreen();
    });

    it('should show a pad whose keys are all disabled for the wait', async () => {
      await renderThemed(<KitGallery />);

      expect(screen.getAllByRole('button', { name: '1', disabled: true })).toHaveLength(1);
    });

    it('should let the pad to try take digits, and show an error after the fourth', async () => {
      await renderThemed(<KitGallery />);
      // The pad to try is the first one on the screen, so its key is the first one found.
      const [seven] = screen.getAllByRole('button', { name: '7', disabled: false });
      if (!seven) throw new Error('The pad to try has no 7 key.');

      fireEvent.press(seven);
      expect(screen.getAllByRole('text', { name: '1 of 4 digits entered' })).toHaveLength(1);
      [1, 2, 3].forEach(() => fireEvent.press(seven));

      expect(screen.getAllByText('Sample error. Try again.')).toHaveLength(1);
    });
  });

  describe('the settings rows', () => {
    it('should show a row with a value, named by its label and value', async () => {
      await renderThemed(<KitGallery />);

      expect(screen.getByRole('button', { name: 'Row with a value, On, PIN' })).toBeOnTheScreen();
    });

    it('should show a danger row, a disabled row and a row with a caption', async () => {
      await renderThemed(<KitGallery />);

      expect(screen.getByRole('button', { name: 'Danger row' })).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Disabled row', disabled: true }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Row with a caption' })).toHaveProp(
        'accessibilityHint',
        'A line under the label.',
      );
    });
  });

  describe('the danger dialog', () => {
    it('should show a dialog with a list, an error and a danger button, only when asked', async () => {
      await renderThemed(<KitGallery />);
      expect(screen.queryByLabelText('Danger dialog title')).not.toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: 'Show danger dialog' }));

      expect(screen.getByLabelText('Danger dialog title')).toHaveProp('role', 'alertdialog');
      expect(screen.getByRole('alert')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Danger confirm' })).toBeOnTheScreen();
    });

    it('should close from the cancel button', async () => {
      await renderThemed(<KitGallery />);
      fireEvent.press(screen.getByRole('button', { name: 'Show danger dialog' }));

      fireEvent.press(screen.getByRole('button', { name: 'Danger cancel' }));

      expect(screen.queryByLabelText('Danger dialog title')).not.toBeOnTheScreen();
    });
  });

  describe('the dialog', () => {
    it('should show the dialog only when asked', async () => {
      await renderThemed(<KitGallery />);
      expect(screen.queryByLabelText('Dialog title')).not.toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: 'Show dialog' }));

      expect(screen.getByLabelText('Dialog title')).toHaveProp('role', 'alertdialog');
    });

    it('should close from either button', async () => {
      await renderThemed(<KitGallery />);
      fireEvent.press(screen.getByRole('button', { name: 'Show dialog' }));

      fireEvent.press(screen.getByRole('button', { name: 'Dialog confirm' }));
      expect(screen.queryByLabelText('Dialog title')).not.toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: 'Show dialog' }));
      fireEvent.press(screen.getByRole('button', { name: 'Dialog cancel' }));
      expect(screen.queryByLabelText('Dialog title')).not.toBeOnTheScreen();
    });
  });

  describe('the cast', () => {
    it.each(characterIds)(
      'should show the %s character with a sample line',
      async (characterId) => {
        await renderThemed(<KitGallery />);

        expect(screen.getByText(characterNames[characterId].name)).toBeOnTheScreen();
        expect(screen.getByText(characterNames[characterId].personality)).toBeOnTheScreen();
      },
    );

    it('should let a mood be picked, as a pressable chip with a selected state', async () => {
      await renderThemed(<KitGallery />);
      const gatekeeper = characterNames.gatekeeper.name;
      expect(
        screen.getByRole('button', { name: `${gatekeeper}, idle`, selected: true }),
      ).toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: `${gatekeeper}, armsCrossed` }));

      expect(
        screen.getByRole('button', { name: `${gatekeeper}, armsCrossed`, selected: true }),
      ).toBeOnTheScreen();
    });

    it('should offer a pose only to the character that has it', async () => {
      await renderThemed(<KitGallery />);

      expect(
        screen.getByRole('button', { name: `${characterNames.host.name}, wave` }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: `${characterNames.shy.name}, wave` }),
      ).not.toBeOnTheScreen();
    });
  });
});
