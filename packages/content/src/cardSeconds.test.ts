import type { Card } from '@getfreak/core';

import { decks } from './decks';

const shippedCards: Card[] = decks.flatMap((deck) => deck.cards);

const smallNumbers: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const tens: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
const secondsPerUnit: Record<string, number> = {
  second: 1,
  sec: 1,
  minute: 60,
  min: 60,
  hour: 3600,
  hr: 3600,
};

const tensWords = Object.keys(tens).join('|');
const smallWords = Object.keys(smallNumbers).join('|');
const amountPattern = `\\d+(?:\\.\\d+)?|(?:${tensWords})(?:[-\\s](?:${smallWords}))?|${smallWords}|an?`;
const unitPattern = '(?:seconds?|secs?|minutes?|mins?|hours?|hrs?)';
// Reads "half a minute", "a minute and a half", "two and a half minutes" and "45 secs".
const timePattern = new RegExp(
  `\\bhalf an? (minute|hour)\\b` +
    `|\\b(${amountPattern})(\\s+and a half)?(?:\\s+full)?\\s+(${unitPattern})\\b(\\s+and a half\\b)?`,
  'gi',
);

function amountOf(word: string): number {
  const [tensWord = '', smallWord] = word.split(/[-\s]/);
  if (tensWord in tens)
    return (tens[tensWord] ?? 0) + (smallWord ? (smallNumbers[smallWord] ?? 0) : 0);
  return smallNumbers[word] ?? (tensWord === 'a' || tensWord === 'an' ? 1 : Number(word));
}

function secondsInUnit(unit: string): number {
  return secondsPerUnit[unit.replace(/s$/, '')] ?? 0;
}

/**
 * Every time a text names, in seconds, such as "two minutes" as 120. "A second" is the ordinal, as
 * in "a second time", and is not a duration.
 */
function namedTimes(text: string): number[] {
  const times: number[] = [];
  for (const match of text.toLowerCase().matchAll(timePattern)) {
    const [, halfUnit, amount, halfBefore, unit, halfAfter] = match;
    if (halfUnit !== undefined) {
      times.push(secondsInUnit(halfUnit) / 2);
      continue;
    }
    if (amount === undefined || unit === undefined) continue;
    const isOrdinal = (amount === 'a' || amount === 'an') && secondsInUnit(unit) === 1;
    if (isOrdinal) continue;
    const half = halfBefore !== undefined || halfAfter !== undefined ? 0.5 : 0;
    times.push((amountOf(amount) + half) * secondsInUnit(unit));
  }
  return times;
}

/**
 * A card that names a time lasts for the longest one: a time given per turn ("each") is one turn,
 * and a smaller time inside a longer one (a pace change, a swap) is part of it. These cards name
 * stages that follow each other, so they last for the total of their stages.
 */
const totalOfStages: Record<string, number> = {
  'starter-c3-09': 90,
  'starter-c3-28': 120,
};

/**
 * Cards that use a word for a time without naming a length the reader can use, and why. A new
 * card goes here only when its text really has no fixed duration.
 */
const wordsWithNoDuration: Record<string, string> = {
  'starter-c3-31': 'the players pick the number of minutes',
};

const mentionsTimeWord = (text: string) => /\b(second|minute|hour)/i.test(text);

function expectedSeconds(card: Card): number | undefined {
  const total = totalOfStages[card.id];
  if (total !== undefined) return total;
  const times = namedTimes(card.text);
  return times.length === 0 ? undefined : Math.max(...times);
}

describe('reading the times a text names', () => {
  it.each([
    ['Hold for ten seconds.', [10]],
    ['Hold for a full minute.', [60]],
    ['Hold for one full minute.', [60]],
    ['Take ninety seconds.', [90]],
    ['Two minutes each.', [120]],
    ['Every thirty seconds for two minutes.', [30, 120]],
    ['Wait 45 seconds.', [45]],
    ['Wait fifteen seconds.', [15]],
    ['Wait eighty seconds.', [80]],
    ['Wait nineteen seconds.', [19]],
    ['Wait twenty-five seconds.', [25]],
    ['Wait forty five seconds.', [45]],
    ['Stay for an hour.', [3600]],
    ['Stay for 2 mins.', [120]],
    ['Stay for 30 secs.', [30]],
    ['Stay for half a minute.', [30]],
    ['Stay for half an hour.', [1800]],
    ['Stay for a minute and a half.', [90]],
    ['Stay for two and a half minutes.', [150]],
    ['Stay for 1.5 minutes.', [90]],
  ])('should find the times in "%s"', (text, expected) => {
    expect(namedTimes(text)).toEqual(expected);
  });

  it.each([
    'Pick a number from one to three.',
    'Take three slow breaths.',
    'Hold for a few seconds.',
    'Go for that many minutes.',
    'Do it until the timer runs out.',
    'Do it a second time.',
  ])('should find no time in "%s"', (text) => {
    expect(namedTimes(text)).toEqual([]);
  });
});

describe('the seconds on shipped cards', () => {
  it('should match the time the text names, and be absent when it names none', () => {
    const mismatches = shippedCards
      .filter((card) => card.seconds !== expectedSeconds(card))
      .map((card) => ({ id: card.id, expected: expectedSeconds(card), actual: card.seconds }));

    expect(mismatches).toEqual([]);
  });

  it('should not let a card use a time word the reader cannot read, unless it is listed', () => {
    const unread = shippedCards.filter(
      (card) =>
        mentionsTimeWord(card.text) &&
        namedTimes(card.text).length === 0 &&
        !(card.id in wordsWithNoDuration),
    );

    expect(unread.map((card) => card.id)).toEqual([]);
  });

  it('should list a card with no duration only while its text still uses a time word and names no time', () => {
    const stale = Object.keys(wordsWithNoDuration).filter((id) => {
      const card = shippedCards.find((candidate) => candidate.id === id);
      return card === undefined || !mentionsTimeWord(card.text) || namedTimes(card.text).length > 0;
    });

    expect(stale).toEqual([]);
  });

  it('should list a stage total only for a card that exists and has a time longer than any it names', () => {
    const unneeded = Object.entries(totalOfStages)
      .filter(([id, total]) => {
        const card = shippedCards.find((candidate) => candidate.id === id);
        return card === undefined || total <= Math.max(...namedTimes(card.text));
      })
      .map(([id]) => id);

    expect(unneeded).toEqual([]);
  });

  it('should carry the field on exactly the cards that name a time, so a broken reader cannot pass', () => {
    expect(shippedCards.filter((card) => card.seconds !== undefined)).toHaveLength(80);
  });
});
