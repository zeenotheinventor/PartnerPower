import * as Updates from 'expo-updates';

/** The error the test route throws. Its name is what a report shows, so it is easy to find. */
export class TestReportError extends Error {
  constructor() {
    super('A test error, thrown on purpose to check that reports arrive');
    this.name = 'TestReportError';
  }
}

/**
 * Whether this build may throw a test error. Only a build that listens to the preview channel may.
 * A store build may not, and neither may a development build, which never reports, or a launch
 * with no channel.
 */
export function isTestErrorAllowed(channel: unknown = Updates.channel): boolean {
  return channel === 'preview';
}
