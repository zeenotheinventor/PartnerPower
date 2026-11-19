import {
  customDeckSchema,
  customQuestionSchema,
  discoverySchema,
  limits,
  newDiscoverySchema,
  playerCardSchema,
  type CustomDeck,
  type CustomQuestion,
  type Discovery,
  type NewDiscovery,
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
  CardDraft,
  DeckDraft,
  PersonalRepository,
  PersonalRepositoryOptions,
  QuestionDraft,
  QuestionProblem,
  SaveResult,
  SqlDatabase,
  SqlExecutor,
} from './types';

type PlayerCardRow = { id: string; category: string; kind: string; text: string };
type DeckRow = { id: string; name: string };
type DeckCardRow = { deck_id: string; card_id: string };
type PlayerQuestionRow = {
  id: string;
  format: string;
  category: string;
  topic: string;
  text: string | null;
  options: string | null;
};
type DiscoveryRow = {
  kind: string;
  question_id: string;
  player: string;
  option_id: string | null;
  strength: string | null;
  created_at: number;
};

// A question row holds no key for a missing text or options, so the schema sees them as absent.
function parseQuestionRow(row: PlayerQuestionRow): CustomQuestion | undefined {
  let options: unknown;
  if (row.options !== null) {
    try {
      options = JSON.parse(row.options);
    } catch {
      return undefined;
    }
  }
  const parsed = customQuestionSchema.safeParse({
    id: row.id,
    format: row.format,
    category: row.category,
    topic: row.topic,
    source: 'player',
    ...(row.text === null ? {} : { text: row.text }),
    ...(options === undefined ? {} : { options }),
  });
  return parsed.success ? parsed.data : undefined;
}

function parseDiscoveryRow(row: DiscoveryRow): Discovery | undefined {
  const date = discoveryDate(row.created_at);
  if (date === undefined) return undefined;
  const shared = { kind: row.kind, questionId: row.question_id, date };
  const candidate =
    row.kind === 'match'
      ? { ...shared, strength: row.strength }
      : row.kind === 'agree'
        ? { ...shared, optionId: row.option_id }
        : { ...shared, optionId: row.option_id, answererName: row.player };
  const parsed = discoverySchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

// Nothing here logs. Card text, deck names and ids are personal, and a failed statement can echo
// the values it was given, so errors are passed up and never reported here.
export function createPersonalRepository(
  options: PersonalRepositoryOptions & { database: SqlDatabase },
): PersonalRepository {
  const { database, getShippedCards, getShippedQuestions, randomUUID, now } = options;
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

  async function readPlayerQuestions(executor: SqlExecutor): Promise<CustomQuestion[]> {
    const rows = await executor.all<PlayerQuestionRow>(
      'SELECT id, format, category, topic, text, options FROM player_question ORDER BY created_at, rowid',
    );
    return rows.flatMap((row) => {
      const question = parseQuestionRow(row);
      return question ? [question] : [];
    });
  }

  async function savePlayerQuestion(
    draft: QuestionDraft,
  ): Promise<SaveResult<CustomQuestion, QuestionProblem>> {
    let result: SaveResult<CustomQuestion, QuestionProblem> = { ok: false, reason: 'limit' };
    await database.transaction(async (transaction) => {
      const stored = await readPlayerQuestions(transaction);
      const existing = stored.find((question) => question.id === draft.id);
      const shippedTexts = getShippedQuestions().flatMap((question) => question.text ?? []);
      const otherTexts = stored
        .filter((question) => question !== existing)
        .flatMap((question) => question.text ?? []);
      const checked = checkQuestionDraftText(draft, shippedTexts, otherTexts);
      if (!checked.ok) {
        result = checked;
        return;
      }
      if (!existing && stored.length >= limits.playerQuestions) return;
      const { text } = checked.value;
      const question = buildPlayerQuestion(
        existing ? existing.id : `pq-${randomUUID()}`,
        draft,
        checked.value,
      );
      const optionsJson = 'options' in question ? JSON.stringify(question.options) : null;
      const time = now();
      if (existing) {
        if (changeInvalidatesDiscoveries(existing, question)) {
          await transaction.run('DELETE FROM discovery WHERE question_id = ?', [existing.id]);
        }
        await transaction.run(
          'UPDATE player_question SET format = ?, category = ?, topic = ?, text = ?, options = ?, updated_at = ? WHERE id = ?',
          [
            question.format,
            question.category,
            question.topic,
            text ?? null,
            optionsJson,
            time,
            question.id,
          ],
        );
      } else {
        await transaction.run(
          'INSERT INTO player_question (id, format, category, topic, text, options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            question.id,
            question.format,
            question.category,
            question.topic,
            text ?? null,
            optionsJson,
            time,
            time,
          ],
        );
      }
      result = { ok: true, saved: question };
    });
    return result;
  }

  async function listDiscoveries(): Promise<Discovery[]> {
    const playerQuestions = await readPlayerQuestions(database);
    const known = new Set([
      ...getShippedQuestions().map((question) => question.id),
      ...playerQuestions.map((question) => question.id),
    ]);
    const offered = offeredOptionIds(getShippedQuestions(), playerQuestions);
    const rows = await database.all<DiscoveryRow>(
      'SELECT kind, question_id, player, option_id, strength, created_at FROM discovery ORDER BY created_at, rowid',
    );
    return rows.flatMap((row) => {
      const discovery = known.has(row.question_id) ? parseDiscoveryRow(row) : undefined;
      return discovery && isOptionOffered(discovery, offered) ? [discovery] : [];
    });
  }

  async function addDiscoveries(drafts: readonly NewDiscovery[]): Promise<void> {
    // A draft that fails the schema, or an answer whose name is only spaces, is skipped, not
    // thrown, and its values are never reported.
    const valid = drafts.flatMap((draft) => {
      const parsed = newDiscoverySchema.safeParse(draft);
      return parsed.success && isStorableDiscovery(parsed.data) ? [parsed.data] : [];
    });
    if (valid.length === 0) return;
    const time = now();
    await database.transaction(async (transaction) => {
      for (const draft of valid) {
        await transaction.run(
          'INSERT OR REPLACE INTO discovery (kind, question_id, player, option_id, strength, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [
            draft.kind,
            draft.questionId,
            discoveryPlayer(draft),
            draft.kind === 'match' ? null : draft.optionId,
            draft.kind === 'match' ? draft.strength : null,
            time,
          ],
        );
      }
    });
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
    listPlayerQuestions: () => readPlayerQuestions(database),
    savePlayerQuestion,
    async deletePlayerQuestion(id) {
      await database.transaction(async (transaction) => {
        await transaction.run('DELETE FROM discovery WHERE question_id = ?', [id]);
        await transaction.run('DELETE FROM player_question WHERE id = ?', [id]);
      });
    },
    listDiscoveries,
    addDiscoveries,
    async removeDiscovery(key) {
      await database.run(
        'DELETE FROM discovery WHERE kind = ? AND question_id = ? AND player = ?',
        [key.kind, key.questionId, discoveryPlayer(key)],
      );
    },
    async clearDiscoveries() {
      await database.run('DELETE FROM discovery');
    },
    takeRecoveryNotice() {
      const isDue = isRecoveryNoticeDue;
      isRecoveryNoticeDue = false;
      return isDue;
    },
  };
}
