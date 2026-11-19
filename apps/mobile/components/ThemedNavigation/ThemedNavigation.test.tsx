import { colorThemes } from '@getfreak/tokens';
import { render, screen } from '@testing-library/react-native';
import { useTheme } from 'expo-router';
import * as ReactNative from 'react-native';
import { Text } from 'react-native';

import { ThemedNavigation } from './ThemedNavigation';

function ThemeProbe() {
  const { colors, dark } = useTheme();
  return (
    <Text>{`${String(colors.background)} ${String(colors.card)} ${dark ? 'dark' : 'light'}`}</Text>
  );
}

describe('ThemedNavigation', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['light', 'dark'] as const)(
    'should give navigators the %s navigation theme with its background token as background and card colour',
    (name) => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(name);

      render(
        <ThemedNavigation>
          <ThemeProbe />
        </ThemedNavigation>,
      );

      const { background } = colorThemes[name];
      expect(screen.getByText(`${background} ${background} ${name}`)).toBeOnTheScreen();
    },
  );
});
