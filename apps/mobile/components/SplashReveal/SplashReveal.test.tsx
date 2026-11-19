import { fireEvent, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

import { SplashReveal } from './SplashReveal';

describe('SplashReveal', () => {
  beforeEach(() => {
    jest.mocked(SplashScreen.hideAsync).mockClear();
  });

  it('should keep the splash screen up until its content has been laid out', () => {
    render(
      <SplashReveal>
        <Text>First screen</Text>
      </SplashReveal>,
    );

    expect(screen.getByText('First screen')).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('should hide the splash screen once its content has been laid out', () => {
    render(
      <SplashReveal>
        <Text>First screen</Text>
      </SplashReveal>,
    );

    fireEvent(screen.getByText('First screen'), 'layout');

    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it('should hide the splash screen only once however often it is laid out', () => {
    render(
      <SplashReveal>
        <Text>First screen</Text>
      </SplashReveal>,
    );

    fireEvent(screen.getByText('First screen'), 'layout');
    fireEvent(screen.getByText('First screen'), 'layout');

    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });
});
