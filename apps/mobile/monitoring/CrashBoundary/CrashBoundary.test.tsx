import { copy } from '@getfreak/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

import { CrashBoundary } from './CrashBoundary';

let shouldThrow = false;
const failure = new Error('render failed');

function Fragile() {
  if (shouldThrow) throw failure;
  return <Text>All good</Text>;
}

describe('CrashBoundary', () => {
  beforeEach(() => {
    shouldThrow = false;
    // React logs a caught render error to the console. That is expected here.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('should show what is below it when nothing fails', () => {
    const onError = jest.fn();

    render(
      <CrashBoundary onError={onError}>
        <Fragile />
      </CrashBoundary>,
    );

    expect(screen.getByText('All good')).toBeOnTheScreen();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should show the crash screen and report the error once when a screen fails', () => {
    shouldThrow = true;
    const onError = jest.fn();

    render(
      <CrashBoundary onError={onError}>
        <Fragile />
      </CrashBoundary>,
    );

    expect(screen.getByRole('header', { name: copy.crash.title })).toBeOnTheScreen();
    expect(screen.getByText(copy.crash.body)).toBeOnTheScreen();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('should not show the error message to the player', () => {
    shouldThrow = true;

    render(
      <CrashBoundary onError={jest.fn()}>
        <Fragile />
      </CrashBoundary>,
    );

    expect(screen.queryByText(/render failed/)).not.toBeOnTheScreen();
  });

  it('should mount what is below it again when the player starts again', () => {
    shouldThrow = true;
    render(
      <CrashBoundary onError={jest.fn()}>
        <Fragile />
      </CrashBoundary>,
    );
    shouldThrow = false;

    fireEvent.press(screen.getByRole('button', { name: copy.crash.restartLabel }));

    expect(screen.getByText('All good')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: copy.crash.title })).not.toBeOnTheScreen();
  });

  it('should do what it is given on starting again, and keep the crash screen until that takes it away', () => {
    shouldThrow = true;
    const onRestart = jest.fn();
    const onError = jest.fn();
    render(
      <CrashBoundary onError={onError} onRestart={onRestart}>
        <Fragile />
      </CrashBoundary>,
    );

    fireEvent.press(screen.getByRole('button', { name: copy.crash.restartLabel }));

    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('header', { name: copy.crash.title })).toBeOnTheScreen();
    // The failed screen was not rendered again, so it was not reported again.
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should take the splash screen down, so a failure during start-up can be seen', () => {
    shouldThrow = true;
    jest.mocked(SplashScreen.hideAsync).mockClear();

    render(
      <CrashBoundary onError={jest.fn()}>
        <Fragile />
      </CrashBoundary>,
    );

    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('should show the crash screen again if the screen fails a second time', () => {
    shouldThrow = true;
    const onError = jest.fn();
    render(
      <CrashBoundary onError={onError}>
        <Fragile />
      </CrashBoundary>,
    );

    fireEvent.press(screen.getByRole('button', { name: copy.crash.restartLabel }));

    expect(screen.getByRole('header', { name: copy.crash.title })).toBeOnTheScreen();
    expect(onError).toHaveBeenCalledTimes(2);
  });
});
