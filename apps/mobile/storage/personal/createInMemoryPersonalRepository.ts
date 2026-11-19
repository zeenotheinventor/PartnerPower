import {
  discoverySchema,
  limits,
  newDiscoverySchema,
  playerCardSchema,
  type CustomDeck,
  type CustomQuestion,
  type Discovery,
  type PlayerCard,
} from '@getfreak/core';

import {
  buildPlayerQuestion,
  changeInvalidatesDiscoveries,
  checkCardDraftText,
  checkDeckDraft,
  checkQuestionDraftText,
  discoveryDate,
  discoveryPlayer,
  isOptionOffered,
  isStorableDiscovery,
  offeredOptionIds,
} from './rules';
import type {
  DiscoveryKey,
  PersonalRepository,
  PersonalRepositoryOptions,
  QuestionProblem,
  SaveResult,
} from './types';

function isSameDiscovery(discovery: Discovery, key: DiscoveryKey): boolean {
  return (
    discovery.kind === key.kind &&
    discovery.questionId === key.questionId &&
    discoveryPlayer(discovery) === discoveryPlayer(key)
  );
}

/**
 * A repository that keeps everything in memory, with the same behaviour as the one over the
 * database, so screen tests do not need SQLite. Both are run through one shared set of tests.
 */
export function createInMemoryPersonalRepository(
  options: PersonalRepositoryOptions,
): PersonalRepository {
  const { getShippedCards, getShippedQuestions, randomUUID, now } = options;
  let playerCards: PlayerCard[] = [];
  let playerQuestions: CustomQuestion[] = [];
  // Every discovery that was added, including those for questions that are missing for now.
  let discoveries: Discovery[] = [];
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

  function knownQuestionIds(): Set<string> {
    return new Set([
      ...getShippedQuestions().map((question) => question.id),
      ...playerQuestions.map((question) => question.id),
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
    async listPlayerQuestions() {
      return [...playerQuestions];
    },
    async savePlayerQuestion(draft): Promise<SaveResult<CustomQuestion, QuestionProblem>> {
      const existing = playerQuestions.find((question) => question.id === draft.id);
      const shippedTexts = getShippedQuestions().flatMap((question) => question.text ?? []);
      const otherTexts = playerQuestions
        .filter((question) => question !== existing)
        .flatMap((question) => question.text ?? []);
      const checked = checkQuestionDraftText(draft, shippedTexts, otherTexts);
      if (!checked.ok) return checked;
      if (!existing && playerQuestions.length >= limits.playerQuestions) {
        return { ok: false, reason: 'limit' };
      }
      const question = buildPlayerQuestion(
        existing ? existing.id : `pq-${randomUUID()}`,
        draft,
        checked.value,
      );
      if (existing && changeInvalidatesDiscoveries(existing, question)) {
        discoveries = discoveries.filter((discovery) => discovery.questionId !== existing.id);
      }
      playerQuestions = existing
        ? playerQuestions.map((stored) => (stored === existing ? question : stored))
        : [...playerQuestions, question];
      return { ok: true, saved: question };
    },
    async deletePlayerQuestion(id) {
      playerQuestions = playerQuestions.filter((question) => question.id !== id);
      discoveries = discoveries.filter((discovery) => discovery.questionId !== id);
    },
    async listDiscoveries() {
      const known = knownQuestionIds();
      const offered = offeredOptionIds(getShippedQuestions(), playerQuestions);
      return discoveries.filter(
        (discovery) => known.has(discovery.questionId) && isOptionOffered(discovery, offered),
      );
    },
    async addDiscoveries(drafts) {
      const date = discoveryDate(now());
      if (date === undefined) return;
      for (const draft of drafts) {
        const parsed = newDiscoverySchema.safeParse(draft);
        if (!parsed.success || !isStorableDiscovery(parsed.data)) continue;
        const discovery = discoverySchema.parse(
          parsed.data.kind === 'answer'
            ? { ...parsed.data, answererName: discoveryPlayer(parsed.data), date }
            : { ...parsed.data, date },
        );
        discoveries = [
          ...discoveries.filter((stored) => !isSameDiscovery(stored, parsed.data)),
          discovery,
        ];
      }
    },
    async removeDiscovery(key) {
      discoveries = discoveries.filter((discovery) => !isSameDiscovery(discovery, key));
    },
    async clearDiscoveries() {
      discoveries = [];
    },
    takeRecoveryNotice() {
      const isDue = isRecoveryNoticeDue;
      isRecoveryNoticeDue = false;
      return isDue;
    },
  };
}
