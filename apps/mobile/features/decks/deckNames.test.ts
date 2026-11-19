import { copy } from '@getfreak/content';

import { customDeckChoice } from './customDeckChoice';
import { deckNameOf } from './deckNames';

const customDecks = [{ id: 'd-1', name: 'Placeholder deck', cardIds: [] }];

describe('deckNameOf', () => {
  it('should name the starter deck and Favourites from the copy', () => {
    expect(deckNameOf('starter', undefined)).toBe(copy.decks.starter);
    expect(deckNameOf('favourites', undefined)).toBe(copy.decks.favourites);
  });

  it('should name Your matches from the copy', () => {
    expect(deckNameOf('matches', undefined)).toBe(copy.decks.matches);
  });

  it('should name a custom deck by the name the player gave it', () => {
    expect(deckNameOf(customDeckChoice('d-1'), customDecks)).toBe('Placeholder deck');
  });

  it('should give no name before the decks have been read', () => {
    expect(deckNameOf(customDeckChoice('d-1'), undefined)).toBeUndefined();
  });

  it('should give no name for a deck that is not stored', () => {
    expect(deckNameOf(customDeckChoice('d-2'), customDecks)).toBeUndefined();
  });
});
