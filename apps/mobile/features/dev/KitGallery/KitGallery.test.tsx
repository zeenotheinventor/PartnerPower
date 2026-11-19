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
