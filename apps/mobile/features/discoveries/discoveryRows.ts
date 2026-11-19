import type { Discovery, Question, TopicId } from '@getfreak/core';

import type { DiscoveryKey } from '../../storage';

type RowBase = { key: DiscoveryKey; topic: TopicId };

export type MatchRow = RowBase & { kind: 'match'; text: string; strength: 'yes' | 'maybe' };
/** A would you rather question has no text of its own unless a player wrote one. */
export type AgreeRow = RowBase & {
  kind: 'agree';
  text: string | undefined;
  optionText: string;
};
export type AnswerRow = RowBase & { kind: 'answer'; text: string; optionText: string };

export type AboutPartner = { name: string; rows: AnswerRow[] };

export type DiscoveryGroups = {
  matches: MatchRow[];
  agreements: AgreeRow[];
  aboutPartners: AboutPartner[];
  /** How many rows there are, which is how many the screen shows. */
  count: number;
};

/**
 * Turns stored discoveries into the rows the screen shows, in three groups, newest first. The list
 * comes oldest first, so each group is read from the end. A discovery whose question, option or
 * format no longer fits is left out, though the store already leaves out most of these. This holds
 * no copy, the screen words every row.
 */
export function buildDiscoveryGroups(
  discoveries: readonly Discovery[],
  questions: readonly Question[],
): DiscoveryGroups {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const matches: MatchRow[] = [];
  const agreements: AgreeRow[] = [];
  const aboutByName = new Map<string, AnswerRow[]>();

  for (const discovery of [...discoveries].reverse()) {
    const question = questionsById.get(discovery.questionId);
    if (!question) continue;

    if (discovery.kind === 'match' && question.format === 'secretMatch') {
      matches.push({
        kind: 'match',
        key: { kind: 'match', questionId: question.id },
        topic: question.topic,
        text: question.text,
        strength: discovery.strength,
      });
    } else if (discovery.kind === 'agree' && question.format === 'eitherOr') {
      const option = question.options.find((candidate) => candidate.id === discovery.optionId);
      if (!option) continue;
      agreements.push({
        kind: 'agree',
        key: { kind: 'agree', questionId: question.id },
        topic: question.topic,
        text: question.text,
        optionText: option.text,
      });
    } else if (discovery.kind === 'answer' && question.format === 'guess') {
      const option = question.options.find((candidate) => candidate.id === discovery.optionId);
      if (!option) continue;
      const rows = aboutByName.get(discovery.answererName) ?? [];
      rows.push({
        kind: 'answer',
        key: { kind: 'answer', questionId: question.id, answererName: discovery.answererName },
        topic: question.topic,
        text: question.text,
        optionText: option.text,
      });
      aboutByName.set(discovery.answererName, rows);
    }
  }

  // A map keeps the order names were first added, which is the order of their newest answers.
  const aboutPartners = [...aboutByName].map(([name, rows]) => ({ name, rows }));
  const count =
    matches.length +
    agreements.length +
    aboutPartners.reduce((total, partner) => total + partner.rows.length, 0);
  return { matches, agreements, aboutPartners, count };
}
