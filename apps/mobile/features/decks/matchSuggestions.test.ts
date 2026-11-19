import { maximumMatchesDeckCards, type Card, type MatchedItem } from '@getfreak/core';

import { matchSuggestions } from './matchSuggestions';

const dare = (id: string, tags: string[], category: Card['category'] = 'c1'): Card => ({
  id,
  category,
  kind: 'solo',
  text: `Dare ${id}`,
  source: 'shipped',
  tags,
});

const yesOn = (tag: string): MatchedItem => ({ strength: 'yes', tags: [tag] });

describe('matchSuggestions', () => {
  it('should rank the dares by what was matched, best first', () => {
    const cards = [dare('d-1', ['tag-a']), dare('d-2', ['tag-a', 'tag-b']), dare('d-3', ['tag-z'])];

    const suggestions = matchSuggestions(cards, [yesOn('tag-a'), yesOn('tag-b')]);

    expect(suggestions.map((card) => card.id)).toEqual(['d-2', 'd-1']);
  });

  it('should give up to the most the matches deck holds', () => {
    const cards = Array.from({ length: maximumMatchesDeckCards + 3 }, (_, index) =>
      dare(`d-${String(index).padStart(2, '0')}`, ['tag-a']),
    );

    expect(matchSuggestions(cards, [yesOn('tag-a')])).toHaveLength(maximumMatchesDeckCards);
  });

  it('should give nothing when nothing is matched', () => {
    expect(matchSuggestions([dare('d-1', ['tag-a'])], [])).toEqual([]);
  });
});
