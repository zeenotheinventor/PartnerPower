import { copy } from '@getfreak/content';

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

  it('should switch on Play a round, Secret match and Your questions, each opening its screen', () => {
    expect(homeEntries.map((entry) => entry.route)).toEqual([
      '/games/questions/setup',
      '/games/questions/match',
      null,
      '/games/questions/my-questions',
    ]);
  });

  it('should show a count on Your questions only', () => {
    expect(homeEntries.map((entry) => entry.countOf)).toEqual([
      undefined,
      undefined,
      undefined,
      'ownQuestions',
    ]);
  });
});
