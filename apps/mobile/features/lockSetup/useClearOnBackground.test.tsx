import { renderHook } from '@testing-library/react-native';

import {
  appStateListenerCount,
  changeAppState,
  fakeAppState,
} from '../../lock/testing/fakeAppState';
import { useClearOnBackground, whileBiometricsPromptIsOpen } from './useClearOnBackground';

describe('useClearOnBackground', () => {
  beforeEach(fakeAppState);
  afterEach(() => jest.restoreAllMocks());

  it.each(['background', 'inactive'] as const)(
    'should call back when the app goes %s',
    async (state) => {
      const onBackground = jest.fn();
      renderHook(() => useClearOnBackground(onBackground));

      await changeAppState(state);

      expect(onBackground).toHaveBeenCalledTimes(1);
    },
  );

  it('should not call back when the app becomes active', async () => {
    const onBackground = jest.fn();
    renderHook(() => useClearOnBackground(onBackground));

    await changeAppState('active');

    expect(onBackground).not.toHaveBeenCalled();
  });

  it('should call the newest callback, not the one from the first render', async () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(
      ({ callback }: { callback: () => void }) => useClearOnBackground(callback),
      {
        initialProps: { callback: first },
      },
    );
    rerender({ callback: second });

    await changeAppState('background');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('should ignore the app going inactive while a biometrics prompt is open, and only then', async () => {
    const onBackground = jest.fn();
    renderHook(() => useClearOnBackground(onBackground));

    await whileBiometricsPromptIsOpen(() => changeAppState('inactive'));
    expect(onBackground).not.toHaveBeenCalled();

    await changeAppState('inactive');
    expect(onBackground).toHaveBeenCalledTimes(1);
  });

  it('should stop ignoring once the prompt has failed', async () => {
    const onBackground = jest.fn();
    renderHook(() => useClearOnBackground(onBackground));

    await whileBiometricsPromptIsOpen(() => Promise.reject(new Error('The prompt failed'))).catch(
      () => undefined,
    );
    await changeAppState('background');

    expect(onBackground).toHaveBeenCalledTimes(1);
  });

  it('should stop listening when it is unmounted', () => {
    const { unmount } = renderHook(() => useClearOnBackground(jest.fn()));
    expect(appStateListenerCount()).toBe(1);

    unmount();

    expect(appStateListenerCount()).toBe(0);
  });
});
