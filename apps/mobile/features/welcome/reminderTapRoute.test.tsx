// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from './testing/appEnvironment';

import { addNotificationResponseReceivedListener } from 'expo-notifications';
import { Slot } from 'expo-router';
import { act } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '../../app/_layout';
import WelcomeRoute from '../../app/welcome';

// The real root layout and welcome route, with the screens behind the guard replaced.
const routes = {
  _layout: RootLayout,
  index: () => <Text>Hub</Text>,
  welcome: WelcomeRoute,
  settings: () => null,
  'dev/kit': () => null,
  'games/dares/_layout': Slot,
  'games/dares/setup': () => null,
};

const registerListener = jest.mocked(addNotificationResponseReceivedListener);

// The tap, as the phone reports it, through the listener the app registered.
function tapTheReminder() {
  const onResponse = registerListener.mock.lastCall?.[0];
  if (!onResponse) throw new Error('The app has not listened for a tap');
  act(() => onResponse({} as never));
}

describe('opening the app from the reminder, in the real root layout', () => {
  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('installMarker', 'true');
    registerListener.mockClear();
  });

  it('should go to the hub from inside a game', async () => {
    await backend.setItem('entryConfirmation', 'true');
    await launchApp('/games/dares/setup', routes);
    expect(currentPathname()).toBe('/games/dares/setup');

    tapTheReminder();

    expect(currentPathname()).toBe('/');
  });

  it('should not listen for a tap before the entry is confirmed', async () => {
    await launchApp('/', routes);

    expect(currentPathname()).toBe('/welcome');
    expect(registerListener).not.toHaveBeenCalled();
  });

  it('should listen for a tap once the entry is confirmed', async () => {
    await backend.setItem('entryConfirmation', 'true');

    await launchApp('/', routes);

    expect(registerListener).toHaveBeenCalledTimes(1);
  });
});
