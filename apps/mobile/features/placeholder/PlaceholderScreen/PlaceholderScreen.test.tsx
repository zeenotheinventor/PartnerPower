import { colorThemes, typeScale } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { PlaceholderScreen } from './PlaceholderScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

// __DEV__ is a read-only global in the type definitions, so it is set through the property.
function setDevelopmentFlag(value: boolean) {
  Object.defineProperty(globalThis, '__DEV__', { value, writable: true, configurable: true });
}

describe('PlaceholderScreen', () => {
  const developmentFlag = __DEV__;

  afterEach(() => {
    setDevelopmentFlag(developmentFlag);
    mockPush.mockClear();
  });

  describe('the link to the kit gallery', () => {
    it('should open the gallery in development', async () => {
      await renderThemed(<PlaceholderScreen />);

      fireEvent.press(screen.getByRole('button', { name: 'Open the UI kit' }));

      expect(mockPush).toHaveBeenCalledWith('/dev/kit');
    });

    it('should not be shown in a production build', async () => {
      setDevelopmentFlag(false);
      await renderThemed(<PlaceholderScreen />);

      expect(screen.queryByRole('button', { name: 'Open the UI kit' })).not.toBeOnTheScreen();
    });
  });

  it('should show the app name as the heading', async () => {
    await renderThemed(<PlaceholderScreen />);

    expect(screen.getByRole('header', { name: 'Get Freak' })).toBeOnTheScreen();
  });

  it('should show that the app is coming soon', async () => {
    await renderThemed(<PlaceholderScreen />);

    expect(screen.getByText('Coming soon')).toBeOnTheScreen();
  });

  describe.each(['light', 'dark'] as const)('with the device in %s mode', (themeName) => {
    it('should set the heading in the display type and the theme text colour', async () => {
      await renderThemed(<PlaceholderScreen />, themeName);

      expect(screen.getByRole('header', { name: 'Get Freak' })).toHaveStyle({
        color: colorThemes[themeName].foreground.toLowerCase(),
        fontFamily: typeScale.display.fontFamily,
        fontSize: typeScale.display.fontSize,
      });
    });

    it('should set the status line in the muted colour', async () => {
      await renderThemed(<PlaceholderScreen />, themeName);

      expect(screen.getByText('Coming soon')).toHaveStyle({
        color: colorThemes[themeName].muted.toLowerCase(),
        fontFamily: typeScale.body.fontFamily,
      });
    });
  });
});
