import { render } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { act } from 'react';

import { SplashSafetyNet, splashSafetyNetMilliseconds } from './SplashSafetyNet';

describe('SplashSafetyNet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(SplashScreen.hideAsync).mockClear();
  });

  afterEach(() => jest.useRealTimers());

  it('should not hide the splash screen before the time is up', () => {
    render(<SplashSafetyNet />);

    act(() => jest.advanceTimersByTime(splashSafetyNetMilliseconds - 1));

    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('should hide the splash screen when the time is up', () => {
    render(<SplashSafetyNet />);

    act(() => jest.advanceTimersByTime(splashSafetyNetMilliseconds));

    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it('should not hide the splash screen after it is removed', () => {
    const { unmount } = render(<SplashSafetyNet />);
    unmount();

    act(() => jest.advanceTimersByTime(splashSafetyNetMilliseconds));

    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });
});
