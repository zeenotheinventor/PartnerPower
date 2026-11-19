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

  it('should switch on only Play a round, which opens setup', () => {
    expect(homeEntries.map((entry) => entry.route)).toEqual([
      '/games/questions/setup',
      null,
      null,
      null,
    ]);
  });
});
