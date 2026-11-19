import { renderHook } from '@testing-library/react-native';
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { Platform } from 'react-native';

import { useBlockScreenCapture } from './useBlockScreenCapture';

const mockPrevent = jest.mocked(preventScreenCaptureAsync);
const mockAllow = jest.mocked(allowScreenCaptureAsync);

describe('useBlockScreenCapture', () => {
  beforeEach(() => {
    mockPrevent.mockClear();
    mockAllow.mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('on Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('should block screen capture while it is told to', () => {
      renderHook(() => useBlockScreenCapture(true));

      expect(mockPrevent).toHaveBeenCalledTimes(1);
      expect(mockAllow).not.toHaveBeenCalled();
    });

    it('should allow screen capture when it is told not to block', () => {
      renderHook(() => useBlockScreenCapture(false));

      expect(mockAllow).toHaveBeenCalledTimes(1);
      expect(mockPrevent).not.toHaveBeenCalled();
    });

    it('should change nothing until it is known whether to block', () => {
      renderHook(() => useBlockScreenCapture(undefined));

      expect(mockPrevent).not.toHaveBeenCalled();
      expect(mockAllow).not.toHaveBeenCalled();
    });

    it('should switch from blocking to allowing when the lock is turned off', () => {
      const { rerender } = renderHook(
        ({ isBlocked }: { isBlocked: boolean }) => useBlockScreenCapture(isBlocked),
        { initialProps: { isBlocked: true } },
      );

      rerender({ isBlocked: false });

      expect(mockPrevent).toHaveBeenCalledTimes(1);
      expect(mockAllow).toHaveBeenCalledTimes(1);
    });

    it('should allow screen capture again when it goes away', () => {
      const { unmount } = renderHook(() => useBlockScreenCapture(true));
      mockAllow.mockClear();

      unmount();

      expect(mockAllow).toHaveBeenCalledTimes(1);
    });

    it('should not throw when the phone refuses', async () => {
      mockPrevent.mockRejectedValueOnce(new Error('Refused'));

      expect(() => renderHook(() => useBlockScreenCapture(true))).not.toThrow();
      await Promise.resolve();
    });
  });

  it('should do nothing on iOS, which has the privacy cover instead', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    const { unmount } = renderHook(() => useBlockScreenCapture(true));
    unmount();

    expect(mockPrevent).not.toHaveBeenCalled();
    expect(mockAllow).not.toHaveBeenCalled();
  });
});
