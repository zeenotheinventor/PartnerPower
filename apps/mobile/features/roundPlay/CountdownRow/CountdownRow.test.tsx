import { act, fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { CountdownRow } from './CountdownRow';
import type { CountdownRowProps } from './types';

const baseProps: CountdownRowProps = {
  seconds: 5,
  startedAt: null,
  isRunning: false,
  startLabel: 'Begin',
  stopLabel: 'Halt',
  onStart: jest.fn(),
  onStop: jest.fn(),
  onEnd: jest.fn(),
};

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('CountdownRow', () => {
  it('should show the start label, and press it to start', async () => {
    await renderThemed(<CountdownRow {...baseProps} />);

    fireEvent.press(screen.getByRole('button', { name: 'Begin' }));

    expect(screen.queryByRole('button', { name: 'Halt' })).not.toBeOnTheScreen();
    expect(baseProps.onStart).toHaveBeenCalledTimes(1);
    expect(baseProps.onStop).not.toHaveBeenCalled();
  });

  it('should show the stop label while it runs, and press it to stop', async () => {
    await renderThemed(<CountdownRow {...baseProps} isRunning startedAt={Date.now()} />);

    fireEvent.press(screen.getByRole('button', { name: 'Halt' }));

    expect(screen.queryByRole('button', { name: 'Begin' })).not.toBeOnTheScreen();
    expect(baseProps.onStop).toHaveBeenCalledTimes(1);
    expect(baseProps.onStart).not.toHaveBeenCalled();
  });

  it('should show the full time before it starts', async () => {
    await renderThemed(<CountdownRow {...baseProps} />);

    expect(screen.getByRole('timer')).toBeOnTheScreen();
    expect(screen.getByText('0:05')).toBeOnTheScreen();
  });

  it('should pass the end of the countdown to onEnd', async () => {
    jest.useFakeTimers();
    await renderThemed(<CountdownRow {...baseProps} isRunning startedAt={Date.now()} />);

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    expect(baseProps.onEnd).toHaveBeenCalledTimes(1);
  });
});
