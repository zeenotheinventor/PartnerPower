// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp as launch } from './testing/appEnvironment';

import { copy } from '@getfreak/content';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

// The screens record each time they render, so a test can tell that a screen never rendered at
// all, not even for a moment. The two behind the guard are replaced by stand-ins and the welcome
// screen is the real one.
const mockRenderedScreens: string[] = [];
jest.mock('../welcome/WelcomeScreen', () => {
  const { WelcomeScreen } = jest.requireActual('../welcome/WelcomeScreen/WelcomeScreen');
  return {
    WelcomeScreen: () => {
      mockRenderedScreens.push('welcome screen');
      return <WelcomeScreen />;
    },
  };
});
jest.mock('../placeholder/PlaceholderScreen', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const content = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return {
    PlaceholderScreen: () => {
      mockRenderedScreens.push('first screen');
      return <Text accessibilityRole="header">{content.copy.appName}</Text>;
    },
  };
});
jest.mock('../dev/KitGallery', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    KitGallery: () => {
      mockRenderedScreens.push('kit gallery');
      return <Text accessibilityRole="header">UI kit</Text>;
    },
  };
});

const confirmButtonName = copy.welcome.confirmLabel;
const firstScreenName = copy.appName;

const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;

describe('the entry guard', () => {
  let consoleSpies: jest.SpyInstance[] = [];

  beforeEach(async () => {
    await backend.clear();
    mockRenderedScreens.length = 0;
    consoleSpies = consoleMethods.map((method) => jest.spyOn(console, method));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function expectNothingLogged() {
    consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  }

  describe('on first launch', () => {
    it('should show the welcome screen', async () => {
      await launch('/');

      expect(currentPathname()).toBe('/welcome');
      expect(screen.getByRole('button', { name: confirmButtonName })).toBeOnTheScreen();
      expect(mockRenderedScreens).not.toContain('first screen');
      expect(mockRenderedScreens).not.toContain('kit gallery');
    });

    it('should send a deep link to a guarded route to the welcome screen', async () => {
      await launch('/dev/kit');

      expect(currentPathname()).toBe('/welcome');
      expect(mockRenderedScreens).not.toContain('first screen');
      expect(mockRenderedScreens).not.toContain('kit gallery');
    });

    it('should send a path that does not exist to the welcome screen', async () => {
      await launch('/games/dares/setup');

      expect(currentPathname()).toBe('/welcome');
      expect(mockRenderedScreens).not.toContain('first screen');
      expect(mockRenderedScreens).not.toContain('kit gallery');
    });

    it('should show the first screen after the player confirms', async () => {
      await launch('/');

      fireEvent.press(screen.getByRole('button', { name: confirmButtonName }));
      await waitFor(() => expect(currentPathname()).toBe('/'));

      expect(screen.getByRole('header', { name: firstScreenName })).toBeOnTheScreen();
    });

    it('should go straight to the first screen on the next launch after confirming', async () => {
      const firstLaunch = await launch('/');
      fireEvent.press(screen.getByRole('button', { name: confirmButtonName }));
      await waitFor(() => expect(currentPathname()).toBe('/'));
      firstLaunch.unmount();
      mockRenderedScreens.length = 0;

      await launch('/');

      expect(currentPathname()).toBe('/');
      expect(screen.getByRole('header', { name: firstScreenName })).toBeOnTheScreen();
      expect(mockRenderedScreens).not.toContain('welcome screen');
    });

    it('should stay on the welcome screen when a guarded route is opened while the app is running', async () => {
      await launch('/');
      expect(currentPathname()).toBe('/welcome');

      await act(async () => {
        router.push('/dev/kit');
        await jest.advanceTimersByTimeAsync(1000);
      });

      expect(currentPathname()).toBe('/welcome');
      expect(screen.getByRole('button', { name: confirmButtonName })).toBeOnTheScreen();
      expect(mockRenderedScreens).not.toContain('kit gallery');
      expectNothingLogged();
    });

    it('should send the built-in sitemap route to the welcome screen', async () => {
      await launch('/_sitemap');

      expect(currentPathname()).toBe('/welcome');
      expect(mockRenderedScreens).not.toContain('first screen');
    });

    it('should read the stored confirmation exactly once, including across confirming', async () => {
      const readSpy = jest.spyOn(backend, 'getItem');
      await launch('/');

      fireEvent.press(screen.getByRole('button', { name: confirmButtonName }));
      await waitFor(() => expect(currentPathname()).toBe('/'));

      expect(readSpy).toHaveBeenCalledTimes(1);
    });

    it('should let the player in for this session when the write fails, and ask again next launch', async () => {
      jest.spyOn(backend, 'setItem').mockRejectedValue(new Error('The write failed'));
      const firstLaunch = await launch('/');

      fireEvent.press(screen.getByRole('button', { name: confirmButtonName }));
      await waitFor(() => expect(currentPathname()).toBe('/'));

      expect(screen.getByRole('header', { name: firstScreenName })).toBeOnTheScreen();
      expectNothingLogged();

      firstLaunch.unmount();
      await launch('/');

      expect(currentPathname()).toBe('/welcome');
    });

    it('should not leave the welcome screen to go back to after confirming', async () => {
      await launch('/');

      fireEvent.press(screen.getByRole('button', { name: confirmButtonName }));
      await waitFor(() => expect(currentPathname()).toBe('/'));

      expect(router.canGoBack()).toBe(false);
    });
  });

  describe('when the player has already confirmed', () => {
    beforeEach(async () => {
      await backend.setItem('entryConfirmation', 'true');
    });

    it('should go straight to the first screen without showing the welcome screen', async () => {
      await launch('/');

      expect(currentPathname()).toBe('/');
      expect(screen.getByRole('header', { name: firstScreenName })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: confirmButtonName })).not.toBeOnTheScreen();
      expect(mockRenderedScreens).not.toContain('welcome screen');
    });

    it('should open a deep link to a route behind the guard', async () => {
      await launch('/dev/kit');

      expect(currentPathname()).toBe('/dev/kit');
      expect(screen.getByRole('header', { name: 'UI kit' })).toBeOnTheScreen();
    });

    it('should send a path that does not exist to the first screen', async () => {
      await launch('/games/dares/setup');

      expect(currentPathname()).toBe('/');
      expect(screen.getByRole('header', { name: firstScreenName })).toBeOnTheScreen();
    });

    it('should send a direct visit to the welcome screen to the first screen', async () => {
      await launch('/welcome');

      expect(currentPathname()).toBe('/');
      expect(screen.queryByRole('button', { name: confirmButtonName })).not.toBeOnTheScreen();
      expect(mockRenderedScreens).not.toContain('welcome screen');
    });
  });
});
