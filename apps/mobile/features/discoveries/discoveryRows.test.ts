import type { CustomQuestion, Discovery, Question } from '@getfreak/core';

import { buildDiscoveryGroups } from './discoveryRows';

const date = '2026-01-01T00:00:00.000Z';
const options = [
  { id: 'a', text: 'Option A' },
  { id: 'b', text: 'Option B' },
];

const secretItem = (id: string): Question => ({
  id,
  format: 'secretMatch',
  category: 'c1',
  topic: 't3',
  source: 'shipped',
  text: `Item ${id}`,
  tags: [],
});
const eitherOr = (id: string, text?: string): Question => ({
  id,
  format: 'eitherOr',
  category: 'c1',
  topic: 't1',
  source: 'shipped',
  options,
  ...(text === undefined ? {} : { text }),
});
const guess = (id: string): Question => ({
  id,
  format: 'guess',
  category: 'c2',
  topic: 't2',
  source: 'shipped',
  text: `Guess ${id}`,
  options,
});

const match = (questionId: string, strength: 'yes' | 'maybe' = 'yes'): Discovery => ({
  kind: 'match',
  questionId,
  strength,
  date,
});
const agree = (questionId: string, optionId = 'a'): Discovery => ({
  kind: 'agree',
  questionId,
  optionId,
  date,
});
const answer = (questionId: string, answererName: string, optionId = 'b'): Discovery => ({
  kind: 'answer',
  questionId,
  optionId,
  answererName,
  date,
});

const questions = [
  secretItem('m1'),
  secretItem('m2'),
  secretItem('m3'),
  eitherOr('e1'),
  eitherOr('e2', 'text of two'),
  guess('g1'),
  guess('g2'),
  guess('g3'),
];

describe('buildDiscoveryGroups', () => {
  it('should give no groups for no discoveries', () => {
    expect(buildDiscoveryGroups([], questions)).toEqual({
      matches: [],
      agreements: [],
      aboutPartners: [],
      count: 0,
    });
  });

  it('should put the newest match first, and look up its text, topic and strength', () => {
    const { matches } = buildDiscoveryGroups(
      [match('m1', 'maybe'), match('m2'), match('m3')],
      questions,
    );

    expect(matches.map((row) => row.text)).toEqual(['Item m3', 'Item m2', 'Item m1']);
    expect(matches[2]).toEqual({
      kind: 'match',
      key: { kind: 'match', questionId: 'm1' },
      topic: 't3',
      text: 'Item m1',
      strength: 'maybe',
    });
  });

  it('should give the picked option text for an agreement, and the question text when it has one', () => {
    const { agreements } = buildDiscoveryGroups([agree('e1', 'b'), agree('e2', 'a')], questions);

    expect(agreements).toEqual([
      {
        kind: 'agree',
        key: { kind: 'agree', questionId: 'e2' },
        topic: 't1',
        text: 'text of two',
        optionText: 'Option A',
      },
      {
        kind: 'agree',
        key: { kind: 'agree', questionId: 'e1' },
        topic: 't1',
        text: undefined,
        optionText: 'Option B',
      },
    ]);
  });

  it('should group answers by name, the group with the newest answer first and the newest first inside', () => {
    const { aboutPartners } = buildDiscoveryGroups(
      [
        answer('g1', 'Player A'),
        answer('g2', 'Player B'),
        answer('g3', 'Player A'),
        answer('g1', 'Player B', 'a'),
      ],
      questions,
    );

    expect(aboutPartners.map((partner) => partner.name)).toEqual(['Player B', 'Player A']);
    expect(aboutPartners[0]?.rows.map((row) => [row.text, row.optionText])).toEqual([
      ['Guess g1', 'Option A'],
      ['Guess g2', 'Option B'],
    ]);
    expect(aboutPartners[1]?.rows.map((row) => row.text)).toEqual(['Guess g3', 'Guess g1']);
    expect(aboutPartners[1]?.rows[0]?.key).toEqual({
      kind: 'answer',
      questionId: 'g3',
      answererName: 'Player A',
    });
  });

  it('should leave out a discovery whose question is missing', () => {
    const groups = buildDiscoveryGroups(
      [match('gone'), agree('gone'), answer('gone', 'Player A'), match('m1')],
      questions,
    );

    expect(groups.count).toBe(1);
    expect(groups.agreements).toEqual([]);
    expect(groups.aboutPartners).toEqual([]);
  });

  it('should leave out a discovery whose option is missing', () => {
    const groups = buildDiscoveryGroups(
      [agree('e1', 'gone'), answer('g1', 'Player A', 'gone')],
      questions,
    );

    expect(groups.count).toBe(0);
  });

  it('should leave out a discovery whose question has another format now', () => {
    const groups = buildDiscoveryGroups(
      [match('e1'), agree('m1'), answer('m2', 'Player A')],
      questions,
    );

    expect(groups.count).toBe(0);
  });

  it('should find a question the player wrote', () => {
    const written: CustomQuestion = {
      id: 'pq-00000000-0000-4000-8000-000000000001',
      format: 'guess',
      category: 'c3',
      topic: 't5',
      source: 'player',
      text: 'Written text',
      options,
    };

    const { aboutPartners } = buildDiscoveryGroups([answer(written.id, 'Player A')], [written]);

    expect(aboutPartners[0]?.rows[0]).toMatchObject({ text: 'Written text', topic: 't5' });
  });

  it('should count every row it keeps', () => {
    const groups = buildDiscoveryGroups(
      [match('m1'), agree('e1'), answer('g1', 'Player A'), answer('g2', 'Player B')],
      questions,
    );

    expect(groups.count).toBe(4);
  });
});
