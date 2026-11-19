// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, launchApp } from './testing/appEnvironment';

import { copy } from '@getfreak/content';
import { Slot } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Appearance, Pressable, Text } from 'react-native';

import RootLayout from '../../app/_layout';
import { useClearEverything } from '../../storage/useClearEverything';
import WelcomeRoute from '../../app/welcome';

// The secure store is a native module, so the test gets an empty in-memory one.
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: () => Promise.resolve(null),
  setItemAsync: () => Promise.resolve(),
  deleteItemAsync: () => Promise.resolve(),
}));

const clearButtonName = 'Clear for the test';

// What had been applied to the phone's appearance each time the first screen rendered.
const firstScreenRenders: unknown[][][] = [];

// Stands in for the settings screen, whose own test covers its row. It runs the real clear everything.
function FirstRoute() {
  firstScreenRenders.push([...jest.mocked(Appearance.setColorScheme).mock.calls]);
  const clearEverything = useClearEverything();
  return (
    <>
      <Text accessibilityRole="header">{copy.appName}</Text>
      <Pressable accessibilityRole="button" onPress={() => void clearEverything()}>
        <Text>{clearButtonName}</Text>
      </Pressable>
    </>
  );
}

const routes = {
  _layout: RootLayout,
  index: FirstRoute,
  welcome: WelcomeRoute,
  settings: () => null,
  'dev/kit': () => null,
  'games/dares/_layout': Slot,
  'games/dares/setup': () => null,
};

// Match phone takes the override away. React Native 0.82 and later get "unspecified", and Jest,
// which has no version, gets null.
const noOverride = [null, 'unspecified'];

describe('the appearance choice in the real root layout', () => {
  let setColorScheme: jest.SpyInstance;

  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
    await backend.setItem('installMarker', 'true');
    firstScreenRenders.length = 0;
    setColorScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
  });

  afterEach(() => {
    setColorScheme.mockRestore();
  });

  // The splash screen hides when the navigator is first laid out, and the navigator renders nothing
  // until the settings have loaded. Jest never lays anything out, so the test checks that the choice
  // is applied before the first screen renders at all, which is always before that layout.
  it('should apply the stored choice before the first screen renders', async () => {
    await backend.setItem('appearance', '"dark"');

    await launchApp('/', routes);

    expect(firstScreenRenders[0]).toEqual([['dark']]);
  });

  it('should match the phone, before the first screen renders, when nothing is stored', async () => {
    await launchApp('/', routes);

    expect(firstScreenRenders[0]).toHaveLength(1);
    expect(noOverride).toContain(firstScreenRenders[0]?.[0]?.[0]);
  });

  it('should return to match phone, and forget the choice, when everything is cleared', async () => {
    await backend.setItem('appearance', '"light"');
    await launchApp('/', routes);
    expect(setColorScheme).toHaveBeenLastCalledWith('light');

    fireEvent.press(screen.getByRole('button', { name: clearButtonName }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: copy.welcome.confirmLabel })).toBeOnTheScreen(),
    );
    expect(await backend.getItem('appearance')).toBeNull();
    expect(noOverride).toContain(setColorScheme.mock.lastCall?.[0]);
  });
});
