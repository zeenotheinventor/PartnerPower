import { copy } from '@getfreak/content';

import { ownQuestionsRoute } from '../ownQuestions/routes';

export type HomeEntry = {
  title: string;
  body: string;
  /** Where the entry opens. Null while it is coming soon, so a ticket switches its entry on here. */
  route: string | null;
  /** Names a count to show at the end of the entry, and to add to its accessible name. */
  countOf?: 'ownQuestions';
};

/** The places the Drink If home leads to, in the order it shows them. */
export const homeEntries: readonly HomeEntry[] = [
  {
    title: copy.questionsHome.playTitle,
    body: copy.questionsHome.playBody,
    route: '/games/questions/setup',
  },
  {
    title: copy.questionsHome.matchTitle,
    body: copy.questionsHome.matchBody,
    route: '/games/questions/match',
  },
  {
    title: copy.questionsHome.discoveriesTitle,
    body: copy.questionsHome.discoveriesBody,
    route: null,
  },
  {
    title: copy.questionsHome.ownTitle,
    body: copy.questionsHome.ownBody,
    route: ownQuestionsRoute,
    countOf: 'ownQuestions',
  },
];
