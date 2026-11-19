import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useIsAppHidden } from './useIsAppHidden';

let handlers: ((status: AppStateStatus) => void)[] = [];
const removeListener = jest.fn();

function renderWithStatus(status: AppStateStatus) {
  AppState.currentState = status;
  return renderHook(() => useIsAppHidden());
}

// React Native updates `currentState` before it tells the listeners.
function changeTo(status: AppStateStatus) {
  AppState.currentState = status;
  act(() => handlers.forEach((handler) => handler(status)));
}

describe('useIsAppHidden', () => {
  const originalStatus = AppState.currentState;

  beforeEach(() => {
    handlers = [];
    removeListener.mockClear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      handlers.push(handler);
      return { remove: removeListener };
    });
  });

  afterEach(() => {
    AppState.currentState = originalStatus;
    jest.restoreAllMocks();
  });

  it('should not be hidden while the app is in the foreground', () => {
    const { result } = renderWithStatus('active');

    expect(result.current).toBe(false);
  });

  it('should be hidden as soon as the app goes inactive, which is when iOS takes the switcher picture', () => {
    const { result } = renderWithStatus('active');

    changeTo('inactive');

    expect(result.current).toBe(true);
  });

  it('should be hidden in the background', () => {
    const { result } = renderWithStatus('active');

    changeTo('background');

    expect(result.current).toBe(true);
  });

  it('should show again when the app comes back to the foreground', () => {
    const { result } = renderWithStatus('active');
    changeTo('inactive');

    changeTo('active');

    expect(result.current).toBe(false);
  });

  it('should start hidden when the app is already inactive', () => {
    const { result } = renderWithStatus('inactive');

    expect(result.current).toBe(true);
  });

  it('should stop listening when it unmounts', () => {
    const { unmount } = renderWithStatus('active');

    unmount();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
