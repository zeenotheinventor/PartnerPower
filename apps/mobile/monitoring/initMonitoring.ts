import { breadcrumbsIntegration, init } from '@sentry/react-native';
import * as Updates from 'expo-updates';

import { scrubBreadcrumb, scrubEvent } from './scrub';

// The environment is typed loosely, so this narrows a read to text that says something.
function nonEmptyText(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

type MonitoringEnvironment = {
  isDevelopment: boolean;
  dsn: unknown;
  commit: unknown;
  runtimeVersion: unknown;
  updateId: unknown;
  channel: unknown;
};

function readEnvironment(): MonitoringEnvironment {
  return {
    isDevelopment: __DEV__,
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    commit: process.env.EXPO_PUBLIC_COMMIT_SHA,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    channel: Updates.channel,
  };
}

/**
 * Starts error reporting in a release build that has a DSN, and does nothing otherwise, so no
 * report can leave from Metro, a development client, Jest or a build made without the DSN.
 * It answers whether reporting was started.
 *
 * The release is the commit the JavaScript was built from, when the build or the update was given
 * one, and the runtime version otherwise. The dist is the running update, so reports group by
 * update. The environment is the update channel.
 */
export function initMonitoring(environment: MonitoringEnvironment = readEnvironment()): boolean {
  const dsn = nonEmptyText(environment.dsn);
  if (environment.isDevelopment || dsn === undefined) return false;

  const runtimeVersion = nonEmptyText(environment.runtimeVersion);

  init({
    dsn,
    environment: nonEmptyText(environment.channel) ?? 'production',
    release: nonEmptyText(environment.commit) ?? runtimeVersion,
    dist: nonEmptyText(environment.updateId),
    initialScope: runtimeVersion === undefined ? {} : { tags: { runtimeVersion } },
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // A session and a client report are sent by the SDK itself and never reach `beforeSend`, so
    // neither is sent.
    enableAutoSessionTracking: false,
    sendClientReports: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    integrations: (defaultIntegrations) => [
      ...defaultIntegrations.filter(({ name }) => name !== 'Breadcrumbs'),
      breadcrumbsIntegration({ console: false, fetch: false, xhr: false }),
    ],
  });
  return true;
}
