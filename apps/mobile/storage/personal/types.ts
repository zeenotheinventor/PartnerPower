import type { CardKind, CardTextProblem, CategoryId, CustomDeck, PlayerCard } from '@getfreak/core';

/** What a statement can do against an open database or an open transaction. */
export type SqlExecutor = {
  /** Runs one or more statements that return nothing. */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly (string | number | null)[]): Promise<void>;
  all<Row>(sql: string, params?: readonly (string | number | null)[]): Promise<Row[]>;
};

export type SqlDatabase = SqlExecutor & {
  /** Runs the work in one transaction. It commits when the work resolves and rolls back if it throws. */
  transaction(work: (transaction: SqlExecutor) => Promise<void>): Promise<void>;
  close(): Promise<void>;
};

/** Opens and deletes the database file. The native module is behind this. */
export type DatabaseFactory = {
  /** Rejects when the key does not open the file that is there. A new file opens with any key. */
  open(key: string): Promise<SqlDatabase>;
  /** Deletes the file. It does nothing when there is none. */
  delete(): Promise<void>;
};

/** Where the database key is kept. It is readable on this device only. */
export type KeyStore = {
  read(): Promise<string | undefined>;
  write(key: string): Promise<void>;
  delete(): Promise<void>;
};

/** The part of a shipped card the repository needs: its id, and its text for repeat checks. */
export type ShippedCard = { id: string; text: string };

export type PersonalRepositoryOptions = {
  /**
   * Gives every shipped card. It is called on each use, not once, so the deck is not loaded
   * until a card is saved or read and a later deck version is seen without a new repository.
   */
  getShippedCards: () => readonly ShippedCard[];
  /** Makes the UUID in a new card or deck id. */
  randomUUID: () => string;
  /** Milliseconds since 1970. Stored as created and changed times. */
  now: () => number;
  /** True when the database was unreadable and was made again empty. See `takeRecoveryNotice`. */
  recoveredFromUnreadable?: boolean;
};

export type CardDraft = {
  /** Leave out to add a new card. Give the id of a stored card to change it. */
  id?: string;
  category: CategoryId;
  kind: CardKind;
  text: string;
};

export type DeckDraft = {
  /** Leave out to add a new deck. Give the id of a stored deck to change it. */
  id?: string;
  name: string;
  cardIds: readonly string[];
};

export type SaveResult<Saved> =
  | { ok: true; saved: Saved }
  | { ok: false; reason: 'invalid'; problems: CardTextProblem[] }
  | { ok: false; reason: 'limit' };

/**
 * The only way to read and write what a couple has written. A row that no longer passes the core
 * schemas is skipped when read. A favourite or deck entry that points at a card that is neither
 * shipped nor a player card is skipped when read and stays in storage, so the card comes back if
 * it returns in a later deck version.
 */
export type PersonalRepository = {
  listPlayerCards(): Promise<PlayerCard[]>;
  /** Tidies and checks the text, and enforces the player card limit. */
  savePlayerCard(draft: CardDraft): Promise<SaveResult<PlayerCard>>;
  /** Also removes the card from favourites and from decks. */
  deletePlayerCard(id: string): Promise<void>;
  listFavourites(): Promise<string[]>;
  setFavourite(cardId: string, isFavourite: boolean): Promise<void>;
  listDecks(): Promise<CustomDeck[]>;
  /** Checks the name and the card list with the core rules, and enforces the deck limits. */
  saveDeck(draft: DeckDraft): Promise<SaveResult<CustomDeck>>;
  deleteDeck(id: string): Promise<void>;
  /**
   * True once after the database was unreadable and was made again empty, so a screen can say so.
   * It is true again only after another recovery.
   */
  takeRecoveryNotice(): boolean;
};
