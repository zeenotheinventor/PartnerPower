import {
  addBreadcrumb,
  captureException,
  close,
  flush,
  getGlobalScope,
} from '@sentry/react-native';
import type { ReactNativeOptions } from '@sentry/react-native';

import { initMonitoring } from './initMonitoring';
import { recordRoute } from './recordRoute';

// This test runs the real SDK and reads the text it would put on the network, so it checks the
// scrubbing as the SDK applies it and not only the two functions on their own.

// The envelopes the SDK hands to its transport, each as the text that would be sent.
const mockSentEnvelopes: string[] = [];
// The type of every item in those envelopes: an event, a session, a client report and so on.
const mockSentItemTypes: unknown[] = [];

type Transport = ReturnType<NonNullable<ReactNativeOptions['transport']>>;

jest.mock('expo-updates', () => ({ runtimeVersion: null, updateId: null, channel: null }));
// The SDK is the real one. Only where it sends to is replaced, and the native side, which has no
// phone here, is left off.
jest.mock('@sentry/react-native', () => {
  // The SDK starts a timer as it loads, which would keep Jest from exiting, so it starts a fake one.
  jest.useFakeTimers();
  const actual = jest.requireActual<typeof import('@sentry/react-native')>('@sentry/react-native');
  jest.useRealTimers();

  return {
    ...actual,
    init: (options: ReactNativeOptions) => {
      actual.init({
        ...options,
        enableNative: false,
        autoInitializeNativeSdk: false,
        transport: () => ({
          send: (envelope: Parameters<Transport['send']>[0]) => {
            mockSentEnvelopes.push(JSON.stringify(envelope));
            mockSentItemTypes.push(...envelope[1].map(([itemHeader]) => itemHeader.type));
            return Promise.resolve({});
          },
          flush: () => Promise.resolve(true),
        }),
      });
    },
  };
});

// Stand-ins for what a player could have put into the app.
const playerName = 'Alexandra';
const cardText = 'Kiss your partner for a full minute';
const typedDare = 'Wear the red one on Friday';
// A stand-in for the id the native side of a phone makes once for each install.
const installId = '7c1d3a52-install-id';

// There is no phone here, so the native side is off. On a phone the SDK merges what the native
// side holds into every event before `beforeSend` runs: a user and a device id made from the
// install id, native tags and extras, and native breadcrumbs. This adds the same things at the
// same point, so the test checks that the scrubbing removes them from what is sent.
function mergeWhatAPhoneWouldAdd() {
  getGlobalScope().addEventProcessor((event) => ({
    ...event,
    user: { id: installId },
    tags: { ...event.tags, 'native.install': installId },
    extra: { ...event.extra, native: installId },
    contexts: {
      ...event.contexts,
      device: {
        id: installId,
        name: `${playerName}'s Pixel`,
        boot_time: '2026-11-19T08:00:00Z',
        model: 'Pixel 9',
      },
    },
    breadcrumbs: [
      ...(event.breadcrumbs ?? []),
      { category: 'ui.click', message: cardText, data: { 'view.id': 'done_button' } },
    ],
  }));
}

describe('what the SDK would send', () => {
  beforeAll(() => {
    initMonitoring({
      isDevelopment: false,
      // A made-up address in the shape of a DSN. It belongs to no project.
      dsn: 'https://public@example.invalid/1',
      commit: 'abc1234',
      runtimeVersion: 'fingerprint-1',
      updateId: 'update-1',
      channel: 'production',
    });
    mergeWhatAPhoneWouldAdd();
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(() => {
    mockSentEnvelopes.length = 0;
    mockSentItemTypes.length = 0;
  });

  it('should send an error with its type, stack, release and route trail, and no player text', async () => {
    recordRoute(['games', 'dares', 'play']);
    addBreadcrumb({ category: 'touch', message: `Pressed "${cardText}"` });
    addBreadcrumb({ category: 'console', message: typedDare });

    captureException(new TypeError(`Could not save "${typedDare}" for ${playerName}`));
    await flush();

    const sent = mockSentEnvelopes.join('\n');
    expect(mockSentItemTypes).toEqual(['event']);
    expect(sent).toContain('TypeError');
    expect(sent).toContain('"release":"abc1234"');
    expect(sent).toContain('"dist":"update-1"');
    expect(sent).toContain('"environment":"production"');
    expect(sent).toContain('/games/dares/play');
    expect(sent).toContain('"frames"');
    [playerName, cardText, typedDare].forEach((text) => expect(sent).not.toContain(text));
  });

  it('should send no user, no IP address and no message', async () => {
    captureException(new Error(`Round for ${playerName} failed`));
    await flush();

    const sent = mockSentEnvelopes.join('\n');
    expect(sent).not.toContain('"user"');
    expect(sent).not.toContain('ip_address');
    expect(sent).not.toContain('"message"');
    expect(sent).not.toContain(playerName);
  });

  it('should send nothing the native side of a phone adds that follows one phone', async () => {
    captureException(new Error('boom'));
    await flush();

    const sent = mockSentEnvelopes.join('\n');
    expect(mockSentItemTypes).toEqual(['event']);
    // The model is the kind of phone, which is kept, so the merge above did run.
    expect(sent).toContain('Pixel 9');
    expect(sent).not.toContain(installId);
    expect(sent).not.toContain('boot_time');
    expect(sent).not.toContain('ui.click');
    expect(sent).not.toContain('done_button');
    [playerName, cardText].forEach((text) => expect(sent).not.toContain(text));
  });

  it('should send the text of a thrown value that is not an error nowhere', async () => {
    captureException({ card: cardText, writtenBy: playerName });
    await flush();

    const sent = mockSentEnvelopes.join('\n');
    expect(mockSentItemTypes).toEqual(['event']);
    [playerName, cardText].forEach((text) => expect(sent).not.toContain(text));
  });

  it('should send nothing but events: no session and no client report', async () => {
    captureException(new Error('one'));
    captureException(new Error('two'));
    await flush();

    expect(new Set(mockSentItemTypes)).toEqual(new Set(['event']));
  });
});
