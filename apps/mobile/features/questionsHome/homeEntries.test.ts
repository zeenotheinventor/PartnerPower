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

  it('should switch on Play a round, Secret match and Discoveries, each with its screen', () => {
    expect(homeEntries.map((entry) => entry.route)).toEqual([
      '/games/questions/setup',
      '/games/questions/match',
      '/games/questions/discoveries',
      null,
    ]);
  });

  it('should open Discoveries where the summary card and the secret match link open it', () => {
    const discoveries = homeEntries.find(
      (entry) => entry.title === copy.questionsHome.discoveriesTitle,
    );

    expect(discoveries?.route).toBe(discoveriesRoute);
  });

  it('should count discoveries on the Discoveries entry only', () => {
    expect(homeEntries.map((entry) => entry.count)).toEqual([
      undefined,
      undefined,
      'discoveries',
      undefined,
    ]);
  });
});
