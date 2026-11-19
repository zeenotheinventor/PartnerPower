import { copy, displayNames } from '@getfreak/content';
import { gameEntries, gameIds } from '@getfreak/core';
import { colorThemes, typeScale } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { HubScreen } from './HubScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

// __DEV__ is a read-only global in the type definitions, so it is set through the property.
function setDevelopmentFlag(value: boolean) {
  Object.defineProperty(globalThis, '__DEV__', { value, writable: true, configurable: true });
}

function expectedTileName(entry: (typeof gameEntries)[number]) {
  const { title } = displayNames[entry.id];
  return entry.status === 'comingSoon' ? `${title}, ${copy.hub.comingSoon}` : title;
}

describe('HubScreen', () => {
  const developmentFlag = __DEV__;

  afterEach(() => {
    setDevelopmentFlag(developmentFlag);
    mockPush.mockClear();
  });

  it('should show the app name as the heading', async () => {
    await renderThemed(<HubScreen />);

    expect(screen.getByRole('header', { name: copy.appName })).toBeOnTheScreen();
  });

  it('should show the greeting', async () => {
    await renderThemed(<HubScreen />);

    expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
  });

  describe('the game tiles', () => {
    it('should show one tile per registered game, in registration order', async () => {
      setDevelopmentFlag(false);
      await renderThemed(<HubScreen />);

      const tileNames = screen.getAllByRole('button').map((tile) => tile.props.accessibilityLabel);
      expect(tileNames.slice(0, gameEntries.length)).toEqual(gameEntries.map(expectedTileName));
    });

    it.each(gameEntries.map((entry) => [entry.id, entry] as const))(
      'should show the title and description of the %s game from the content package',
      async (_gameId, entry) => {
        await renderThemed(<HubScreen />);

        expect(screen.getByText(displayNames[entry.id].title)).toBeOnTheScreen();
        expect(screen.getByText(displayNames[entry.id].description)).toBeOnTheScreen();
      },
    );

    it('should open the entry route of an available game when its tile is pressed', async () => {
      await renderThemed(<HubScreen />);
      const available = gameEntries.filter((entry) => entry.status === 'available');

      available.forEach((entry) => {
        fireEvent.press(screen.getByRole('button', { name: expectedTileName(entry) }));
        expect(mockPush).toHaveBeenLastCalledWith(entry.entryRoute);
      });
      expect(available).not.toHaveLength(0);
    });
  });

  describe('the settings button', () => {
    it('should open the settings screen when pressed', async () => {
      await renderThemed(<HubScreen />);

      fireEvent.press(screen.getByRole('button', { name: copy.hub.settings }));

      expect(mockPush).toHaveBeenCalledWith('/settings');
    });

    it('should come after the last game tile, and in a production build be the last button', async () => {
      setDevelopmentFlag(false);
      await renderThemed(<HubScreen />);

      const buttons = screen.getAllByRole('button');

      expect(buttons).toHaveLength(gameEntries.length + 1);
      expect(buttons.at(-1)).toBe(screen.getByRole('button', { name: copy.hub.settings }));
    });
  });

  describe('the link to the kit gallery', () => {
    it('should open the gallery in development', async () => {
      await renderThemed(<HubScreen />);

      fireEvent.press(screen.getByRole('button', { name: 'Open the UI kit' }));

      expect(mockPush).toHaveBeenCalledWith('/dev/kit');
    });

    it('should not be shown in a production build', async () => {
      setDevelopmentFlag(false);
      await renderThemed(<HubScreen />);

      expect(screen.queryByRole('button', { name: 'Open the UI kit' })).not.toBeOnTheScreen();
    });
  });

  describe.each(['light', 'dark'] as const)('with the device in %s mode', (themeName) => {
    it('should set the first tile title in the heading type and the theme text colour', async () => {
      await renderThemed(<HubScreen />, themeName);
      const firstGame = displayNames[gameIds[0]];

      expect(screen.getByText(firstGame.title)).toHaveStyle({
        color: colorThemes[themeName].foreground.toLowerCase(),
        fontFamily: typeScale.heading.fontFamily,
        fontSize: typeScale.heading.fontSize,
      });
    });

    it('should set the first tile description in the muted colour', async () => {
      await renderThemed(<HubScreen />, themeName);
      const firstGame = displayNames[gameIds[0]];

      expect(screen.getByText(firstGame.description)).toHaveStyle({
        color: colorThemes[themeName].muted.toLowerCase(),
        fontFamily: typeScale.body.fontFamily,
      });
    });
  });
});
