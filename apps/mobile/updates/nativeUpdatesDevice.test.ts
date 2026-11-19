import { getLaunchedUpdateFromNativeModule } from './nativeUpdatesDevice';

// The module is replaced with one whose values the tests set.
const mockUpdates: { isEmbeddedLaunch: unknown; updateId: unknown } = {
  isEmbeddedLaunch: false,
  updateId: 'update-1',
};
let mockThrowOnRead = false;

jest.mock('expo-updates', () => ({
  get isEmbeddedLaunch() {
    if (mockThrowOnRead) throw new Error('native module missing');
    return mockUpdates.isEmbeddedLaunch;
  },
  get updateId() {
    if (mockThrowOnRead) throw new Error('native module missing');
    return mockUpdates.updateId;
  },
}));

describe('getLaunchedUpdateFromNativeModule', () => {
  afterEach(() => {
    mockThrowOnRead = false;
    mockUpdates.isEmbeddedLaunch = false;
    mockUpdates.updateId = 'update-1';
  });

  it('should report the update the app launched from', () => {
    expect(getLaunchedUpdateFromNativeModule()).toEqual({
      isEmbeddedLaunch: false,
      updateId: 'update-1',
    });
  });

  it('should report an embedded launch with no update id', () => {
    mockUpdates.isEmbeddedLaunch = true;
    mockUpdates.updateId = null;

    expect(getLaunchedUpdateFromNativeModule()).toEqual({ isEmbeddedLaunch: true, updateId: null });
  });

  it('should report nothing when the native module throws', () => {
    mockThrowOnRead = true;

    expect(getLaunchedUpdateFromNativeModule()).toBeUndefined();
  });

  it.each([
    ['a flag that is not a boolean', { isEmbeddedLaunch: 'no', updateId: 'update-1' }],
    ['an id that is not text', { isEmbeddedLaunch: false, updateId: 5 }],
  ])('should report nothing for %s', (_name, values) => {
    mockUpdates.isEmbeddedLaunch = values.isEmbeddedLaunch;
    mockUpdates.updateId = values.updateId;

    expect(getLaunchedUpdateFromNativeModule()).toBeUndefined();
  });
});
