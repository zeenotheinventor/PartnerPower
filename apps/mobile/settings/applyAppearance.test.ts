import { colorScheme } from 'nativewind/test';
import { Appearance, Platform } from 'react-native';

import { applyAppearance } from './applyAppearance';

describe('applyAppearance', () => {
  let setColorScheme: jest.SpyInstance;

  beforeEach(() => {
    setColorScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
  });

  afterEach(() => {
    setColorScheme.mockRestore();
    colorScheme.set('light');
  });

  it.each(['light', 'dark'] as const)('should make the whole app %s', (choice) => {
    applyAppearance(choice);

    expect(setColorScheme).toHaveBeenLastCalledWith(choice);
    expect(colorScheme.get()).toBe(choice);
  });

  it('should hand the choice back to the phone for match phone', () => {
    applyAppearance('dark');
    applyAppearance('system');

    // NativeWind sends "unspecified" on React Native 0.82 and later, and null under Jest, which
    // has no version. Either one removes the override.
    expect([null, 'unspecified']).toContain(setColorScheme.mock.lastCall?.[0]);
  });

  it('should send "unspecified" for match phone on React Native 0.86', () => {
    const constants = jest.spyOn(Platform, 'constants', 'get').mockReturnValue({
      ...Platform.constants,
      reactNativeVersion: { major: 0, minor: 86, patch: 3 },
    });

    applyAppearance('system');
    constants.mockRestore();

    expect(setColorScheme).toHaveBeenLastCalledWith('unspecified');
  });
});
