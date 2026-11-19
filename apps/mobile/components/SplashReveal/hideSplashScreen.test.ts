import * as SplashScreen from 'expo-splash-screen';

import { hideSplashScreen } from './hideSplashScreen';

describe('hideSplashScreen', () => {
  beforeEach(() => jest.mocked(SplashScreen.hideAsync).mockClear());

  it('should try again once when the first attempt is refused', async () => {
    jest.mocked(SplashScreen.hideAsync).mockRejectedValueOnce(new Error('Not ready'));

    await hideSplashScreen();

    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(2);
  });

  it('should give up quietly when the second attempt is refused too', async () => {
    jest.mocked(SplashScreen.hideAsync).mockRejectedValue(new Error('Not ready'));

    await expect(hideSplashScreen()).resolves.toBeUndefined();

    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(2);
    jest.mocked(SplashScreen.hideAsync).mockResolvedValue(undefined);
  });
});
