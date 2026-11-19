import { init } from '@sentry/react-native';

import { initMonitoring } from './initMonitoring';
import { scrubBreadcrumb, scrubEvent } from './scrub';

jest.mock('expo-updates', () => ({ runtimeVersion: null, updateId: null, channel: null }));

// A made-up address in the shape of a DSN. It belongs to no project.
const dsn = 'https://public@example.invalid/1';

const releaseBuild = {
  isDevelopment: false,
  dsn,
  commit: 'abc1234',
  runtimeVersion: 'fingerprint-1',
  updateId: 'update-1',
  channel: 'production',
};

describe('initMonitoring', () => {
  afterEach(() => jest.clearAllMocks());

  it('should not start in development, even with a DSN', () => {
    expect(initMonitoring({ ...releaseBuild, isDevelopment: true })).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it.each([undefined, '', null, 5])('should not start when the DSN is %p', (missingDsn) => {
    expect(initMonitoring({ ...releaseBuild, dsn: missingDsn })).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('should not start under Jest when it reads the real environment', () => {
    expect(initMonitoring()).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('should start in a release build that has a DSN', () => {
    expect(initMonitoring(releaseBuild)).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('should name the release after the commit, the dist after the update, and the environment after the channel', () => {
    initMonitoring(releaseBuild);

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn,
        release: 'abc1234',
        dist: 'update-1',
        environment: 'production',
        initialScope: { tags: { runtimeVersion: 'fingerprint-1' } },
      }),
    );
  });

  it('should fall back to the runtime version as the release when the build has no commit', () => {
    initMonitoring({ ...releaseBuild, commit: undefined });

    expect(init).toHaveBeenCalledWith(expect.objectContaining({ release: 'fingerprint-1' }));
  });

  it('should leave out what an embedded launch does not have', () => {
    initMonitoring({
      ...releaseBuild,
      commit: undefined,
      runtimeVersion: null,
      updateId: null,
      channel: null,
    });

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        release: undefined,
        dist: undefined,
        environment: 'production',
        initialScope: {},
      }),
    );
  });

  it('should send no personal data, no sessions, no screenshots and no traces, and scrub everything else', () => {
    initMonitoring(releaseBuild);

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        sendDefaultPii: false,
        tracesSampleRate: 0,
        enableAutoSessionTracking: false,
        sendClientReports: false,
        attachScreenshot: false,
        attachViewHierarchy: false,
        beforeSend: scrubEvent,
        beforeBreadcrumb: scrubBreadcrumb,
      }),
    );
  });
});
