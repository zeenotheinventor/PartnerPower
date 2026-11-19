import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useWaitCountdown } from './useWaitCountdown';

async function advance(milliseconds: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

describe('useWaitCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.UTC(2026, 10, 19, 9, 0, 0));
    // React Native's own Jest setup already makes this a mock, so earlier calls are cleared.
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockClear()
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should have no line and not be waiting until a wait starts', () => {
    const { result } = renderHook(() => useWaitCountdown());

    expect(result.current.isWaiting).toBe(false);
    expect(result.current.message).toBeUndefined();
  });

  it('should show the time left as minutes and seconds once a wait starts', () => {
    const { result } = renderHook(() => useWaitCountdown());

    act(() => result.current.startWait(30_000));

    expect(result.current.isWaiting).toBe(true);
    expect(result.current.message).toBe('Too many tries. Try again in 0:30.');
  });

  it('should count down each second', async () => {
    const { result } = renderHook(() => useWaitCountdown());
    act(() => result.current.startWait(30_000));

    await advance(6_000);

    expect(result.current.message).toBe('Too many tries. Try again in 0:24.');
  });

  it('should show minutes for a long wait', () => {
    const { result } = renderHook(() => useWaitCountdown());

    act(() => result.current.startWait(125_000));

    expect(result.current.message).toBe('Too many tries. Try again in 2:05.');
  });

  it('should stop waiting when the time is up', async () => {
    const { result } = renderHook(() => useWaitCountdown());
    act(() => result.current.startWait(30_000));

    await advance(30_000);

    expect(result.current.isWaiting).toBe(false);
    expect(result.current.message).toBeUndefined();
  });

  it('should announce the line at the start and then every 10 seconds, not each second', async () => {
    const { result } = renderHook(() => useWaitCountdown());
    act(() => result.current.startWait(30_000));
    const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);

    expect(announce.mock.calls.map(([line]) => line)).toEqual([
      'Too many tries. Try again in 0:30.',
    ]);
    // One second at a time, because each tick is its own render.
    for (let second = 0; second < 30; second += 1) await advance(1_000);

    expect(announce.mock.calls.map(([line]) => line)).toEqual([
      'Too many tries. Try again in 0:30.',
      'Too many tries. Try again in 0:20.',
      'Too many tries. Try again in 0:10.',
    ]);
  });

  it('should start from the time it is given when a wait begins part way through', () => {
    const { result } = renderHook(() => useWaitCountdown());

    act(() => result.current.startWait(24_000));

    expect(result.current.message).toBe('Too many tries. Try again in 0:24.');
  });

  it('should stop its timer when it is unmounted', async () => {
    const { result, unmount } = renderHook(() => useWaitCountdown());
    act(() => result.current.startWait(30_000));

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
