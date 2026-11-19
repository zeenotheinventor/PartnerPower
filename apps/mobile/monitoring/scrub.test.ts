import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

import { scrubBreadcrumb, scrubEvent } from './scrub';

// Stand-ins for what a player could have put into the app.
const playerName = 'Alexandra';
const cardText = 'Kiss your partner for a full minute';
const typedDare = 'Wear the red one on Friday';
const playerText = [playerName, cardText, typedDare];

function expectNoPlayerText(value: unknown) {
  const sent = JSON.stringify(value);
  playerText.forEach((text) => expect(sent).not.toContain(text));
}

describe('scrubEvent', () => {
  it('should remove the message of every exception and keep its type and stack', () => {
    const stacktrace = { frames: [{ filename: 'app:///index.bundle', lineno: 12, colno: 4 }] };
    const event: ErrorEvent = {
      type: undefined,
      exception: {
        values: [{ type: 'TypeError', value: `Could not save "${typedDare}"`, stacktrace }],
      },
    };

    const scrubbed = scrubEvent(event);

    expect(scrubbed.exception?.values).toEqual([{ type: 'TypeError', stacktrace }]);
    expectNoPlayerText(scrubbed);
  });

  it('should remove the event message, the log entry and the extra data', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: `Round for ${playerName} failed`,
      logentry: { message: cardText },
      extra: { __serialized__: { card: cardText, dare: typedDare } },
    };

    const scrubbed = scrubEvent(event);

    expect(scrubbed.message).toBeUndefined();
    expect(scrubbed.logentry).toBeUndefined();
    expect(scrubbed.extra).toBeUndefined();
    expectNoPlayerText(scrubbed);
  });

  it('should remove the user, the request and the server name', () => {
    const event: ErrorEvent = {
      type: undefined,
      user: { id: 'install-1', ip_address: '203.0.113.9', username: playerName },
      request: { url: `getfreak://decks?name=${playerName}` },
      server_name: `${playerName}'s phone`,
    };

    const scrubbed = scrubEvent(event);

    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request).toBeUndefined();
    expect(scrubbed.server_name).toBeUndefined();
    expectNoPlayerText(scrubbed);
  });

  it('should keep only the tags the app sets itself', () => {
    const event: ErrorEvent = {
      type: undefined,
      tags: { runtimeVersion: 'abc123', deck: typedDare, player: playerName },
    };

    expect(scrubEvent(event).tags).toEqual({ runtimeVersion: 'abc123' });
  });

  it('should keep the contexts the phone supplies and drop any other', () => {
    const event: ErrorEvent = {
      type: undefined,
      contexts: {
        os: { name: 'Android', version: '16' },
        device: { model: 'Pixel 9', name: `${playerName}'s Pixel` },
        round: { card: cardText, players: [playerName] },
      },
    };

    const scrubbed = scrubEvent(event);

    expect(scrubbed.contexts).toEqual({
      os: { name: 'Android', version: '16' },
      device: { model: 'Pixel 9' },
    });
    expectNoPlayerText(scrubbed);
  });

  it('should scrub the breadcrumbs an event carries', () => {
    const event: ErrorEvent = {
      type: undefined,
      breadcrumbs: [
        { category: 'touch', message: `Pressed "${cardText}"` },
        { category: 'console', message: typedDare },
        { category: 'navigation', message: playerName, data: { to: '/games/dares/play' } },
      ],
    };

    const scrubbed = scrubEvent(event);

    expect(scrubbed.breadcrumbs).toEqual([
      { category: 'navigation', data: { to: '/games/dares/play' } },
    ]);
    expectNoPlayerText(scrubbed);
  });

  it('should leave an event with none of these parts as it is', () => {
    const event: ErrorEvent = { type: undefined, release: 'abc123', dist: 'update-1' };

    expect(scrubEvent(event)).toEqual(event);
  });
});

describe('scrubBreadcrumb', () => {
  it.each(['touch', 'console', 'xhr', 'fetch', 'http', 'ui.click', undefined])(
    'should drop a breadcrumb in the category %s',
    (category) => {
      const breadcrumb: Breadcrumb = { category, message: cardText };

      expect(scrubBreadcrumb(breadcrumb)).toBeNull();
    },
  );

  it('should keep a navigation breadcrumb with its route and nothing else', () => {
    const breadcrumb: Breadcrumb = {
      category: 'navigation',
      message: `Opened ${typedDare}`,
      data: { to: '/decks/[deckId]', from: playerName, params: { name: typedDare } },
    };

    expect(scrubBreadcrumb(breadcrumb)).toEqual({
      category: 'navigation',
      data: { to: '/decks/[deckId]' },
    });
  });

  it('should keep an app lifecycle breadcrumb with its state', () => {
    const breadcrumb: Breadcrumb = { category: 'app.lifecycle', data: { state: 'background' } };

    expect(scrubBreadcrumb(breadcrumb)).toEqual(breadcrumb);
  });

  it('should drop a data value that is not text', () => {
    const breadcrumb: Breadcrumb = {
      category: 'navigation',
      data: { to: { name: playerName } },
    };

    expect(scrubBreadcrumb(breadcrumb)).toEqual({ category: 'navigation', data: {} });
  });

  it('should keep a listed breadcrumb that has no data', () => {
    expect(scrubBreadcrumb({ category: 'navigation' })).toEqual({ category: 'navigation' });
  });
});
