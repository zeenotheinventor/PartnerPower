import { getAppVersionLabel } from './getAppVersionLabel';

// The native module is replaced by values the test sets, because under Jest it only says "mock".
const mockNativeValues: { version: string | null; build: string | null } = {
  version: null,
  build: null,
};
jest.mock('expo-application', () => ({
  get nativeApplicationVersion() {
    return mockNativeValues.version;
  },
  get nativeBuildVersion() {
    return mockNativeValues.build;
  },
}));

describe('getAppVersionLabel', () => {
  it('should give the version and the build, as the store shows them', () => {
    mockNativeValues.version = '1.2.0';
    mockNativeValues.build = '34';

    expect(getAppVersionLabel()).toBe('Version 1.2.0 (34)');
  });

  it('should give the version alone when there is no build number', () => {
    mockNativeValues.version = '1.2.0';
    mockNativeValues.build = null;

    expect(getAppVersionLabel()).toBe('Version 1.2.0');
  });

  it('should give nothing when the phone does not report a version', () => {
    mockNativeValues.version = null;
    mockNativeValues.build = '34';

    expect(getAppVersionLabel()).toBeNull();
  });
});
