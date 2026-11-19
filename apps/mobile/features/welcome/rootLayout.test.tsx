import * as SplashScreen from 'expo-splash-screen';

import './testing/appEnvironment';
import '../../app/_layout';

describe('root layout', () => {
  it('should keep the splash screen up from the moment the app starts', () => {
    // The call is made when the module loads, so it has happened by the time this test runs.
    expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled();
  });
});
