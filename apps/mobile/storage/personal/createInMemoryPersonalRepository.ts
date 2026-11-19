import { limits, playerCardSchema, type CustomDeck, type PlayerCard } from '@getfreak/core';

import { checkCardDraftText, checkDeckDraft } from './rules';
import type { PersonalRepository, PersonalRepositoryOptions, SaveResult } from './types';

/**
 * A repository that keeps everything in memory, with the same behaviour as the one over the
 * database, so screen tests do not need SQLite. Both are run through one shared set of tests.
 */
export function createInMemoryPersonalRepository(
  options: PersonalRepositoryOptions,
): PersonalRepository {
  const { getShippedCards, randomUUID } = options;
  let playerCards: PlayerCard[] = [];
  let favourites: string[] = [];
  // A deck keeps every card id it was saved with, including ids that are missing for now.
  let decks: CustomDeck[] = [];
  let isRecoveryNoticeDue = options.recoveredFromUnreadable === true;

  function knownCardIds(): Set<string> {
    return new Set([
      ...getShippedCards().map((card) => card.id),
      ...playerCards.map((card) => card.id),
    ]);
  }

  return {
    async listPlayerCards() {
      return [...playerCards];
    },
    async savePlayerCard(draft): Promise<SaveResult<PlayerCard>> {
      const existing = playerCards.find((card) => card.id === draft.id);
      const checked = checkCardDraftText(
        draft.text,
        getShippedCards(),
        playerCards.filter((card) => card !== existing).map((card) => card.text),
      );
      if (!checked.ok) return checked;
      if (existing) {
        const changed: PlayerCard = {
          ...existing,
          category: draft.category,
          kind: draft.kind,
          text: checked.value,
        };
        playerCards = playerCards.map((card) => (card === existing ? changed : card));
        return { ok: true, saved: changed };
      }
      if (playerCards.length >= limits.playerCards) return { ok: false, reason: 'limit' };
      const card = playerCardSchema.parse({
        id: `p-${randomUUID()}`,
        category: draft.category,
        kind: draft.kind,
        text: checked.value,
        source: 'player',
      });
      playerCards = [...playerCards, card];
      return { ok: true, saved: card };
    },
    async deletePlayerCard(id) {
      playerCards = playerCards.filter((card) => card.id !== id);
      favourites = favourites.filter((cardId) => cardId !== id);
      decks = decks.map((deck) => ({
        ...deck,
        cardIds: deck.cardIds.filter((cardId) => cardId !== id),
      }));
    },
    async listFavourites() {
      const known = knownCardIds();
      return favourites.filter((cardId) => known.has(cardId));
    },
    async setFavourite(cardId, isFavourite) {
      if (isFavourite) {
        if (!favourites.includes(cardId)) favourites = [...favourites, cardId];
      } else {
        favourites = favourites.filter((favourite) => favourite !== cardId);
      }
    },
    async listDecks() {
      const known = knownCardIds();
      return decks.map((deck) => ({
        ...deck,
        cardIds: deck.cardIds.filter((cardId) => known.has(cardId)),
      }));
    },
    async saveDeck(draft): Promise<SaveResult<CustomDeck>> {
      const checked = checkDeckDraft(draft.name, draft.cardIds);
      if (!checked.ok) return checked;
      const { name, cardIds } = checked.value;
      const existing = decks.find((deck) => deck.id === draft.id);
      if (!existing) {
        if (decks.length >= limits.customDecks) return { ok: false, reason: 'limit' };
        const deck = { id: `d-${randomUUID()}`, name, cardIds };
        decks = [...decks, deck];
        return { ok: true, saved: deck };
      }
      // A card that is missing now stays after the cards the draft lists, as in the database.
      const known = knownCardIds();
      const keptCardIds = existing.cardIds.filter(
        (cardId) => !known.has(cardId) && !cardIds.includes(cardId),
      );
      const changed = { id: existing.id, name, cardIds: [...cardIds, ...keptCardIds] };
      decks = decks.map((deck) => (deck === existing ? changed : deck));
      return { ok: true, saved: { id: existing.id, name, cardIds } };
    },
    async deleteDeck(id) {
      decks = decks.filter((deck) => deck.id !== id);
    },
    takeRecoveryNotice() {
      const isDue = isRecoveryNoticeDue;
      isRecoveryNoticeDue = false;
      return isDue;
    },
  };
}
