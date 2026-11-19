import * as Updates from 'expo-updates';

/** The error the test route throws. Its name is what a report shows, so it is easy to find. */
export class TestReportError extends Error {
  constructor() {
    super('A test error, thrown on purpose to check that reports arrive');
    this.name = 'TestReportError';
  }
}

const channelsThatAllowATestError: readonly unknown[] = ['preview', 'development'];

/**
 * Whether this build may throw a test error. Only builds that listen to the preview or the
 * development channel may. A store build, and a launch with no channel, may not.
 */
export function isTestErrorAllowed(channel: unknown = Updates.channel): boolean {
  return channelsThatAllowATestError.includes(channel);
}
