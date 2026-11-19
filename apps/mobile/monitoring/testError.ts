import * as Updates from 'expo-updates';

/** The error the test route throws. Its name is what a report shows, so it is easy to find. */
export class TestReportError extends Error {
  constructor() {
    super('A test error, thrown on purpose to check that reports arrive');
    this.name = 'TestReportError';
  }
}

// The channels of builds that report errors. The project has no preview stage, so the live
// channel is the one that matters. `preview` is the channel of the builds made before that was
// decided, and it goes when FRK-84 retires it.
const channelsThatReport: readonly unknown[] = ['production', 'preview'];

/**
 * Whether this build may throw a test error. A build that listens to a channel that reports may.
 * A development build may not, since it never reports, and neither may a launch with no channel.
 */
export function isTestErrorAllowed(channel: unknown = Updates.channel): boolean {
  return channelsThatReport.includes(channel);
}
