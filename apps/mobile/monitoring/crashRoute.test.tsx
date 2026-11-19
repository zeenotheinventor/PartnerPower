// This import comes first so that its mocks are in place before Expo Router loads.
import {
  backend,
  currentPathname,
  launchApp as launch,
} from '../features/welcome/testing/appEnvironment';

import { copy } from '@getfreak/content';
import { addBreadcrumb, captureException } from '@sentry/react-native';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

// The first screen is replaced by one that fails on demand.
let mockShouldFail = false;
const mockFailure = new Error('first screen failed');
jest.mock('../features/hub/HubScreen', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const content = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return {
    HubScreen: () => {
      if (mockShouldFail) throw mockFailure;
      return <Text accessibilityRole="header">{content.copy.appName}</Text>;
    },
  };
});

function recordedRoutes() {
  return jest
    .mocked(addBreadcrumb)
    .mock.calls.map(([breadcrumb]) => breadcrumb.data?.to as unknown);
}

describe('a screen that fails', () => {
  beforeEach(async () => {
    await backend.clear();
    mockShouldFail = false;
    jest.clearAllMocks();
    // React logs a caught render error to the console. That is expected here.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('should show the crash screen, report the error, and come back to the first screen', async () => {
    await launch('/');
    mockShouldFail = true;

    fireEvent.press(screen.getByRole('button', { name: copy.welcome.confirmLabel }));

    await waitFor(() =>
      expect(screen.getByRole('header', { name: copy.crash.title })).toBeOnTheScreen(),
    );
    expect(captureException).toHaveBeenCalledWith(mockFailure);
    expect(screen.queryByText(/first screen failed/)).not.toBeOnTheScreen();

    mockShouldFail = false;
    fireEvent.press(screen.getByRole('button', { name: copy.crash.restartLabel }));

    await waitFor(() =>
      expect(screen.getByRole('header', { name: copy.appName })).toBeOnTheScreen(),
    );
    expect(currentPathname()).toBe('/');
  });

  it('should report nothing when no screen fails', async () => {
    await launch('/');

    fireEvent.press(screen.getByRole('button', { name: copy.welcome.confirmLabel }));
    await waitFor(() => expect(currentPathname()).toBe('/'));

    expect(captureException).not.toHaveBeenCalled();
  });
});

describe('the route trail', () => {
  beforeEach(async () => {
    await backend.clear();
    mockShouldFail = false;
    jest.clearAllMocks();
  });

  it('should record each screen the player moves to, by route name', async () => {
    await launch('/');

    fireEvent.press(screen.getByRole('button', { name: copy.welcome.confirmLabel }));
    await waitFor(() => expect(currentPathname()).toBe('/'));

    // The app opens at the first route, and the entry guard sends it to the welcome screen.
    await waitFor(() => expect(recordedRoutes()).toEqual(['/', '/welcome', '/']));
  });
});
