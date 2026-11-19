import { act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Stands in for the phone's app state in a test. It records the listeners that screens add, and
 * `changeAppState` tells them the app moved. Call it in `beforeEach`.
 */
const listeners = new Set<(state: AppStateStatus) => void>();

export function fakeAppState() {
  listeners.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  });
}

export async function changeAppState(state: AppStateStatus) {
  await act(async () => {
    [...listeners].forEach((listener) => listener(state));
  });
}

export const appStateListenerCount = () => listeners.size;
