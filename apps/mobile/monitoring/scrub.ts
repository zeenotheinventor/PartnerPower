import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

/*
 * What may leave the app in an error report. An error message can quote a card, a player's name or
 * something a player wrote, so no message text is sent at all. A report keeps the error type and
 * the stack, which is enough to find the line that threw.
 *
 * Every level here is an allowlist: the event, each context, the tags, and each breadcrumb. What is
 * not named is not sent. That matters because the SDK merges in whatever the native side of the
 * phone holds, such as an install id on the device and a user made from the same id.
 */

// The parts of an event that are sent. There is no `message`, `logentry`, `extra`, `user`,
// `request` or `server_name` here, so none of those leave.
const eventKeysSent = [
  'event_id',
  'timestamp',
  'platform',
  'level',
  'type',
  'release',
  'dist',
  'environment',
  'sdk',
  'debug_meta',
  'exception',
  'contexts',
  'tags',
  'breadcrumbs',
] as const satisfies readonly (keyof ErrorEvent)[];

// The only breadcrumbs sent, and the data each may carry. Both are built from fixed words: the
// route the player moved to, as folder names with no parameter values, and the app coming forward
// or going away. A tap breadcrumb is worded from the label of what was pressed, and a console
// breadcrumb from whatever was logged, so neither is listed.
const breadcrumbDataKeysSent: Record<string, readonly string[]> = {
  navigation: ['to'],
  'app.lifecycle': ['state'],
};

const breadcrumbKeysSent = [
  'category',
  'type',
  'level',
  'timestamp',
] as const satisfies readonly (keyof Breadcrumb)[];

// The contexts that are sent, and the keys of each. They describe the kind of phone and the running
// update. The device has no `id`, `name`, `boot_time`, `timezone` or `locale`, each of which
// follows one phone or one person. An update's emergency launch reason is free text, so it is left
// out too.
const contextKeysSent: Record<string, readonly string[]> = {
  os: ['name', 'version', 'build', 'kernel_version', 'rooted'],
  device: ['family', 'model', 'model_id', 'manufacturer', 'brand', 'arch', 'simulator'],
  app: ['app_version', 'app_build', 'app_identifier', 'in_foreground'],
  runtime: ['name', 'version'],
  ota_updates: [
    'channel',
    'runtime_version',
    'update_id',
    'is_enabled',
    'is_embedded_launch',
    'is_emergency_launch',
  ],
  react_native_context: [
    'js_engine',
    'hermes_version',
    'react_native_version',
    'expo_sdk_version',
    'turbo_module',
    'fabric',
  ],
  trace: ['trace_id', 'span_id', 'parent_span_id'],
};

// The tags this app sets itself. See initMonitoring.
const tagKeysSent = ['runtimeVersion'];

function pick<Source extends object>(source: Source, keys: readonly string[]): Partial<Source> {
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => keys.includes(key) && value !== undefined),
  ) as Partial<Source>;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const { category, data } = breadcrumb;
  const dataKeysSent = category === undefined ? undefined : breadcrumbDataKeysSent[category];
  if (dataKeysSent === undefined) return null;

  // A message is worded from what happened on screen, so none is sent.
  const scrubbed: Breadcrumb = pick(breadcrumb, breadcrumbKeysSent);
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
  return Object.fromEntries(
    Object.entries(contextKeysSent).flatMap(([name, keys]) => {
      const context = contexts[name];
      return context === undefined ? [] : [[name, pick(context, keys)]];
    }),
  );
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed: ErrorEvent = { ...pick(event, eventKeysSent), type: undefined };

  if (event.exception?.values !== undefined) {
    scrubbed.exception = {
      values: event.exception.values.map((exception) => {
        // The value is the error's message.
        const withoutMessage = { ...exception };
        delete withoutMessage.value;
        return withoutMessage;
      }),
    };
  }

  if (event.tags !== undefined) scrubbed.tags = pick(event.tags, tagKeysSent);
  if (event.contexts !== undefined) scrubbed.contexts = scrubContexts(event.contexts);

  if (event.breadcrumbs !== undefined) {
    scrubbed.breadcrumbs = event.breadcrumbs.flatMap(
      (breadcrumb) => scrubBreadcrumb(breadcrumb) ?? [],
    );
  }

  return scrubbed;
}
