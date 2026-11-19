import { copy } from '@getfreak/content';

import { discoveriesRoute } from '../discoveries/routes';

export type HomeEntry = {
  title: string;
  body: string;
  /** Where the entry opens. Null while it is coming soon, so a ticket switches its entry on here. */
  route: string | null;
  /** What the entry counts at the end of its row. Entries without it show no count. */
  count?: 'discoveries';
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
    route: discoveriesRoute,
    count: 'discoveries',
  },
  { title: copy.questionsHome.ownTitle, body: copy.questionsHome.ownBody, route: null },
];
