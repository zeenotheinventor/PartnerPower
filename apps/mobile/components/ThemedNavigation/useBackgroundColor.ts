import { colorThemes } from '@getfreak/tokens';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

/**
 * The background token of the current theme, as a value, for the navigation theme, which
 * cannot take a class name. The same colour is set on the native window, so a gap between screens
 * never shows the wrong theme.
 */
export function useBackgroundColor() {
  const theme = useColorScheme() === 'dark' ? colorThemes.dark : colorThemes.light;
  const backgroundColor = theme.background;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(backgroundColor);
  }, [backgroundColor]);

  return backgroundColor;
}
