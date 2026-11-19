import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

/*
 * What may leave the app in an error report. An error message can quote a card, a player's name or
 * something a player wrote, so no message text is sent at all. A report keeps the error type and
 * the stack, which is enough to find the line that threw.
 *
 * Everything here is an allowlist: what is not named is not sent.
 */

// The only breadcrumbs sent. Both are built by code of ours or by the SDK from fixed words: the
// route the player moved to, as folder names with no parameter values, and the app coming forward
// or going away. A tap breadcrumb is worded from the label of what was pressed, and a console
// breadcrumb from whatever was logged, so neither is listed.
const breadcrumbDataKeysSent: Record<string, readonly string[]> = {
  navigation: ['to'],
  'app.lifecycle': ['state'],
};

// The contexts the SDK builds from the phone and the running update, never from what a player did.
const contextKeysSent = [
  'trace',
  'os',
  'device',
  'app',
  'culture',
  'runtime',
  'ota_updates',
  'react_native_context',
];

// The tags this app sets itself. See initMonitoring.
const tagKeysSent = ['runtimeVersion'];

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const { category, data } = breadcrumb;
  const dataKeysSent = category === undefined ? undefined : breadcrumbDataKeysSent[category];
  if (dataKeysSent === undefined) return null;

  // A message is worded from what happened on screen, so none is sent.
  const scrubbed: Breadcrumb = { ...breadcrumb };
  delete scrubbed.message;
  if (data === undefined) return scrubbed;

  scrubbed.data = Object.fromEntries(
    dataKeysSent.flatMap((key) => {
      const value: unknown = data[key];
      return typeof value === 'string' ? [[key, value]] : [];
    }),
  );
  return scrubbed;
}

type Contexts = NonNullable<ErrorEvent['contexts']>;

function scrubContexts(contexts: Contexts): Contexts {
  const sent: Contexts = Object.fromEntries(
    Object.entries(contexts).filter(([key]) => contextKeysSent.includes(key)),
  );

  if (sent.device !== undefined) {
    // The name the owner gave the phone, which is often their own name.
    const device = { ...sent.device };
    delete device.name;
    sent.device = device;
  }
  return sent;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed: ErrorEvent = { ...event };

  delete scrubbed.message;
  delete scrubbed.logentry;
  // Where the SDK puts a thrown value that is not an Error, serialised in full.
  delete scrubbed.extra;
  // There are no accounts, and nothing may follow a person or a phone.
  delete scrubbed.user;
  delete scrubbed.request;
  delete scrubbed.server_name;

  if (event.exception?.values !== undefined) {
    scrubbed.exception = {
      ...event.exception,
      values: event.exception.values.map((exception) => {
        const withoutMessage = { ...exception };
        delete withoutMessage.value;
        return withoutMessage;
      }),
    };
  }

  if (event.tags !== undefined) {
    scrubbed.tags = Object.fromEntries(
      Object.entries(event.tags).filter(([key]) => tagKeysSent.includes(key)),
    );
  }

  if (event.contexts !== undefined) {
    scrubbed.contexts = scrubContexts(event.contexts);
  }

  if (event.breadcrumbs !== undefined) {
    scrubbed.breadcrumbs = event.breadcrumbs.flatMap(
      (breadcrumb) => scrubBreadcrumb(breadcrumb) ?? [],
    );
  }

  return scrubbed;
}
