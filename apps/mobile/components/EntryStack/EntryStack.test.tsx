import { render } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import { EntryStack } from './EntryStack';

jest.mock('../../settings', () => ({
  useSettings: () => ({ isLoading: true, hasConfirmedEntry: false }),
}));

describe('EntryStack', () => {
  it('should keep the splash screen up while the settings are loading', () => {
    jest.mocked(SplashScreen.hideAsync).mockClear();

    render(<EntryStack />);

    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });
});
