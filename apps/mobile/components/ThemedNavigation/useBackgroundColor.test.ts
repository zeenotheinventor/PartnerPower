import { colorThemes, type ColorThemeName } from '@getfreak/tokens';
import { renderHook } from '@testing-library/react-native';
import * as SystemUI from 'expo-system-ui';
import * as ReactNative from 'react-native';

import { useBackgroundColor } from './useBackgroundColor';

const themeNames: ColorThemeName[] = ['light', 'dark'];

describe('useBackgroundColor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.mocked(SystemUI.setBackgroundColorAsync).mockClear();
  });

  it.each(themeNames)('should return the %s background token when the device is %s', (name) => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(name);

    const { result } = renderHook(() => useBackgroundColor());

    expect(result.current).toBe(colorThemes[name].background);
  });

  it.each(themeNames)('should paint the %s window background natively', (name) => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(name);

    renderHook(() => useBackgroundColor());

    expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith(colorThemes[name].background);
  });

  it('should follow the device from light to dark while mounted', () => {
    const useColorScheme = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    const { result, rerender } = renderHook(() => useBackgroundColor());

    useColorScheme.mockReturnValue('dark');
    rerender({});

    expect(result.current).toBe(colorThemes.dark.background);
    expect(SystemUI.setBackgroundColorAsync).toHaveBeenLastCalledWith(colorThemes.dark.background);
  });
});
