import { copy } from '@getfreak/content';
import { fireEvent, render, screen } from '@testing-library/react-native';
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
