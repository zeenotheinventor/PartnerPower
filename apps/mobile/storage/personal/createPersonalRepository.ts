import {
  customDeckSchema,
  limits,
  playerCardSchema,
  type CustomDeck,
  type PlayerCard,
} from '@getfreak/core';

import { checkCardDraftText, checkDeckDraft } from './rules';
import type {
  CardDraft,
  DeckDraft,
  PersonalRepository,
  PersonalRepositoryOptions,
  SaveResult,
  SqlDatabase,
  SqlExecutor,
} from './types';

type PlayerCardRow = { id: string; category: string; kind: string; text: string };
type DeckRow = { id: string; name: string };
type DeckCardRow = { deck_id: string; card_id: string };

// Nothing here logs. Card text, deck names and ids are personal, and a failed statement can echo
// the values it was given, so errors are passed up and never reported here.
export function createPersonalRepository(
  options: PersonalRepositoryOptions & { database: SqlDatabase },
): PersonalRepository {
  const { database, getShippedCards, randomUUID, now } = options;
  let isRecoveryNoticeDue = options.recoveredFromUnreadable === true;

  // A row that fails the core schema is skipped, not thrown.
  async function readPlayerCards(executor: SqlExecutor): Promise<PlayerCard[]> {
    const rows = await executor.all<PlayerCardRow>(
      'SELECT id, category, kind, text FROM player_card ORDER BY created_at, rowid',
    );
    return rows.flatMap((row) => {
      const parsed = playerCardSchema.safeParse({ ...row, source: 'player' });
      return parsed.success ? [parsed.data] : [];
    });
  }

  async function readKnownCardIds(executor: SqlExecutor): Promise<Set<string>> {
    const playerCards = await readPlayerCards(executor);
    return new Set([
      ...getShippedCards().map((card) => card.id),
      ...playerCards.map((card) => card.id),
    ]);
  }

  async function savePlayerCard(draft: CardDraft): Promise<SaveResult<PlayerCard>> {
    let result: SaveResult<PlayerCard> = { ok: false, reason: 'limit' };
    await database.transaction(async (transaction) => {
      const stored = await readPlayerCards(transaction);
      const existing = stored.find((card) => card.id === draft.id);
      const checked = checkCardDraftText(
        draft.text,
        getShippedCards(),
        stored.filter((card) => card !== existing).map((card) => card.text),
      );
      if (!checked.ok) {
        result = checked;
        return;
      }
      const time = now();
      if (existing) {
        await transaction.run(
          'UPDATE player_card SET category = ?, kind = ?, text = ?, updated_at = ? WHERE id = ?',
          [draft.category, draft.kind, checked.value, time, existing.id],
        );
        result = {
          ok: true,
          saved: { ...existing, category: draft.category, kind: draft.kind, text: checked.value },
        };
        return;
      }
      if (stored.length >= limits.playerCards) {
        result = { ok: false, reason: 'limit' };
        return;
      }
      const card = playerCardSchema.parse({
        id: `p-${randomUUID()}`,
        category: draft.category,
        kind: draft.kind,
        text: checked.value,
        source: 'player',
      });
      await transaction.run(
        'INSERT INTO player_card (id, category, kind, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [card.id, card.category, card.kind, card.text, time, time],
      );
      result = { ok: true, saved: card };
    });
    return result;
  }

  async function saveDeck(draft: DeckDraft): Promise<SaveResult<CustomDeck>> {
    const checked = checkDeckDraft(draft.name, draft.cardIds);
    if (!checked.ok) return checked;
    const { name, cardIds } = checked.value;
    let result: SaveResult<CustomDeck> = { ok: false, reason: 'limit' };
    await database.transaction(async (transaction) => {
      const decks = await transaction.all<{ id: string }>('SELECT id FROM deck');
      const isExisting = decks.some((deck) => deck.id === draft.id);
      if (!isExisting && decks.length >= limits.customDecks) return;
      const id = isExisting && draft.id !== undefined ? draft.id : `d-${randomUUID()}`;
      const time = now();
      let keptCardIds: string[] = [];
      if (isExisting) {
        // A card that is missing now is not in the draft, because a screen never saw it. It stays
        // in storage after the cards the draft lists, so it can come back with its card.
        const known = await readKnownCardIds(transaction);
        const storedCardIds = await transaction.all<DeckCardRow>(
          'SELECT deck_id, card_id FROM deck_card WHERE deck_id = ? ORDER BY position',
          [id],
        );
        keptCardIds = storedCardIds
          .map((row) => row.card_id)
          .filter((cardId) => !known.has(cardId) && !cardIds.includes(cardId));
        await transaction.run('UPDATE deck SET name = ?, updated_at = ? WHERE id = ?', [
          name,
          time,
          id,
        ]);
        await transaction.run('DELETE FROM deck_card WHERE deck_id = ?', [id]);
      } else {
        await transaction.run(
          'INSERT INTO deck (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
          [id, name, time, time],
        );
      }
      const allCardIds = [...cardIds, ...keptCardIds];
      for (const [position, cardId] of allCardIds.entries()) {
        await transaction.run(
          'INSERT INTO deck_card (deck_id, card_id, position) VALUES (?, ?, ?)',
          [id, cardId, position],
        );
      }
      result = { ok: true, saved: customDeckSchema.parse({ id, name, cardIds }) };
    });
    return result;
  }

  return {
    listPlayerCards: () => readPlayerCards(database),
    savePlayerCard,
    async deletePlayerCard(id) {
      await database.transaction(async (transaction) => {
        await transaction.run('DELETE FROM favourite WHERE card_id = ?', [id]);
        await transaction.run('DELETE FROM deck_card WHERE card_id = ?', [id]);
        await transaction.run('DELETE FROM player_card WHERE id = ?', [id]);
      });
    },
    async listFavourites() {
      const known = await readKnownCardIds(database);
      const rows = await database.all<{ card_id: string }>(
        'SELECT card_id FROM favourite ORDER BY created_at, rowid',
      );
      return rows.map((row) => row.card_id).filter((cardId) => known.has(cardId));
    },
    async setFavourite(cardId, isFavourite) {
      if (isFavourite) {
        await database.run('INSERT OR IGNORE INTO favourite (card_id, created_at) VALUES (?, ?)', [
          cardId,
          now(),
        ]);
      } else {
        await database.run('DELETE FROM favourite WHERE card_id = ?', [cardId]);
      }
    },
    async listDecks() {
      const known = await readKnownCardIds(database);
      const decks = await database.all<DeckRow>(
        'SELECT id, name FROM deck ORDER BY created_at, rowid',
      );
      const cards = await database.all<DeckCardRow>(
        'SELECT deck_id, card_id FROM deck_card ORDER BY deck_id, position',
      );
      return decks.flatMap((deck) => {
        const cardIds = cards
          .filter((row) => row.deck_id === deck.id && known.has(row.card_id))
          .map((row) => row.card_id);
        const parsed = customDeckSchema.safeParse({ id: deck.id, name: deck.name, cardIds });
        return parsed.success ? [parsed.data] : [];
      });
    },
    saveDeck,
    async deleteDeck(id) {
      await database.run('DELETE FROM deck WHERE id = ?', [id]);
    },
    takeRecoveryNotice() {
      const isDue = isRecoveryNoticeDue;
      isRecoveryNoticeDue = false;
      return isDue;
    },
  };
}
