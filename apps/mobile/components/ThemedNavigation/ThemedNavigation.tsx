import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useBackgroundColor } from './useBackgroundColor';

type ThemedNavigationProps = { children: ReactNode };

/**
 * Gives every navigator below it the navigation library's light or dark theme, with the current
 * theme's background token as its background and card colour, so no stack, nested or not,
 * falls back to the wrong colours between screens.
 */
export function ThemedNavigation({ children }: ThemedNavigationProps) {
  const backgroundColor = useBackgroundColor();
  const baseTheme = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...baseTheme,
        colors: { ...baseTheme.colors, background: backgroundColor, card: backgroundColor },
      }}
    >
      {children}
    </ThemeProvider>
  );
}
