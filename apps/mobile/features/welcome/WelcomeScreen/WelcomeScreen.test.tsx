import { copy } from '@getfreak/content';
import { act, fireEvent, screen } from 'nativewind/test';

import { createInMemoryBackend } from '../../../storage/createInMemoryBackend';
import { createStorage } from '../../../storage/createStorage';
import { SettingsProvider } from '../../../settings';
import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { WelcomeScreen } from './WelcomeScreen';

async function renderWelcome() {
  const backend = createInMemoryBackend();
  await renderThemed(
    <SettingsProvider storage={createStorage(backend)}>
      <WelcomeScreen />
    </SettingsProvider>,
  );
  // Let the provider finish reading the stored settings.
  await act(async () => {});
  return backend;
}

describe('WelcomeScreen', () => {
  describe('the question', () => {
    it('should greet the player and ask the question', async () => {
      await renderWelcome();

      expect(screen.getByText(copy.welcome.greeting)).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: copy.welcome.question })).toBeOnTheScreen();
      expect(screen.getByText(copy.welcome.note)).toBeOnTheScreen();
    });

    it('should have Nyx say the greeting with her arms crossed, hidden from screen readers', async () => {
      await renderWelcome();

      expect(drawnCharacters()).toEqual([
        {
          props: { character: 'gatekeeper', mood: 'armsCrossed', size: 'hero' },
          isHiddenFromScreenReaders: true,
        },
      ]);
    });

    it('should leave the heading to be read on its own, not merged into a group', async () => {
      await renderWelcome();

      expect(screen.queryByRole('group')).not.toBeOnTheScreen();
    });

    it('should offer a confirm button and a decline button', async () => {
      await renderWelcome();

      expect(screen.getByRole('button', { name: copy.welcome.confirmLabel })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.welcome.declineLabel })).toBeOnTheScreen();
    });

    it('should store the confirmation when confirmed', async () => {
      const backend = await renderWelcome();

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: copy.welcome.confirmLabel }));
      });

      expect(backend.entries.get('entryConfirmation')).toBe('true');
    });
  });

  describe('declining', () => {
    async function renderDeclined() {
      const backend = await renderWelcome();
      fireEvent.press(screen.getByRole('button', { name: copy.welcome.declineLabel }));
      return backend;
    }

    it('should show the closing screen', async () => {
      await renderDeclined();

      expect(screen.getByText(copy.welcomeDeclined.greeting)).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: copy.welcomeDeclined.title })).toBeOnTheScreen();
      expect(screen.getByText(copy.welcomeDeclined.body)).toBeOnTheScreen();
    });

    it('should have Nyx turn the player away, hidden from screen readers', async () => {
      await renderDeclined();

      expect(drawnCharacters()).toEqual([
        {
          props: { character: 'gatekeeper', mood: 'idle', size: 'hero' },
          isHiddenFromScreenReaders: true,
        },
      ]);
    });

    it('should offer only a way back, with no way in', async () => {
      await renderDeclined();

      expect(
        screen.getByRole('button', { name: copy.welcomeDeclined.backLabel }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: copy.welcome.confirmLabel }),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: copy.welcome.declineLabel }),
      ).not.toBeOnTheScreen();
    });

    it('should store nothing', async () => {
      const backend = await renderDeclined();

      expect(backend.entries.size).toBe(0);
    });

    it('should return to the question when the player goes back', async () => {
      await renderDeclined();

      fireEvent.press(screen.getByRole('button', { name: copy.welcomeDeclined.backLabel }));

      expect(screen.getByRole('header', { name: copy.welcome.question })).toBeOnTheScreen();
      expect(screen.queryByText(copy.welcomeDeclined.greeting)).not.toBeOnTheScreen();
    });
  });
});
