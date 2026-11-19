import { copy } from '@getfreak/content';

import { discoveriesRoute } from '../questionsSummary/discoveriesRoute';
import { homeEntries } from './homeEntries';

describe('homeEntries', () => {
  it('should list the four places in order, named from the content package', () => {
    expect(homeEntries.map((entry) => entry.title)).toEqual([
      copy.questionsHome.playTitle,
      copy.questionsHome.matchTitle,
      copy.questionsHome.discoveriesTitle,
      copy.questionsHome.ownTitle,
    ]);
  });

  it('should describe each place from the content package', () => {
    expect(homeEntries.map((entry) => entry.body)).toEqual([
      copy.questionsHome.playBody,
      copy.questionsHome.matchBody,
      copy.questionsHome.discoveriesBody,
      copy.questionsHome.ownBody,
    ]);
  });

  it('should switch on every place, each opening its screen', () => {
    expect(homeEntries.map((entry) => entry.route)).toEqual([
      '/games/questions/setup',
      '/games/questions/match',
      '/games/questions/discoveries',
      '/games/questions/my-questions',
    ]);
  });

  it('should show a count on Discoveries and Your questions only', () => {
    expect(homeEntries.map((entry) => entry.countOf)).toEqual([
      undefined,
      undefined,
      'discoveries',
      'ownQuestions',
    ]);
  });

  it('should open Discoveries where the summary card and the secret match link open it', () => {
    const discoveries = homeEntries.find(
      (entry) => entry.title === copy.questionsHome.discoveriesTitle,
    );

    expect(discoveries?.route).toBe(discoveriesRoute);
  });
});
