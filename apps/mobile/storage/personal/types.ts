import type {
  CardKind,
  CardTextProblem,
  CategoryId,
  CustomDeck,
  CustomQuestion,
  Discovery,
  NewDiscovery,
  PlayerCard,
  TopicId,
} from '@getfreak/core';

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

/** The part of a shipped question the repository needs: its id, and its text for repeat checks. */
export type ShippedQuestion = {
  id: string;
  text?: string;
  /** The ids of its options. Leave out when not known, and its discoveries are not checked against them. */
  optionIds?: readonly string[];
};

export type PersonalRepositoryOptions = {
  /**
   * Gives every shipped card. It is called on each use, not once, so the deck is not loaded
   * until a card is saved or read and a later deck version is seen without a new repository.
   */
  getShippedCards: () => readonly ShippedCard[];
  /** Gives every shipped question, called on each use for the same reason as `getShippedCards`. */
  getShippedQuestions: () => readonly ShippedQuestion[];
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

export type SaveResult<Saved, Problem = CardTextProblem> =
  | { ok: true; saved: Saved }
  | { ok: false; reason: 'invalid'; problems: Problem[] }
  | { ok: false; reason: 'limit' };

/** The text problems, plus `optionCount` when the format does not allow that many options. */
export type QuestionProblem = CardTextProblem | 'optionCount';

export type QuestionDraft = {
  /** Leave out to add a new question. Give the id of a stored question to change it. */
  id?: string;
  format: CustomQuestion['format'];
  category: CategoryId;
  topic: TopicId;
  /** Only an either-or question may leave it empty. */
  text: string;
  /**
   * The option wording, 2 to 4 for `guess` and exactly 2 for `eitherOr`. Leave out for `ifYou` and
   * `neverHave`. Option ids are positional (`o1`, `o2`, ...), so a changed wording keeps its id.
   */
  options?: readonly string[];
};

/** Names one stored discovery. `answererName` is needed for `answer` only. */
export type DiscoveryKey = {
  kind: Discovery['kind'];
  questionId: string;
  answererName?: string;
};

/**
 * The only way to read and write what a couple has written. A row that no longer passes the core
 * schemas is skipped when read. A favourite, deck entry or discovery that points at a card or
 * question that is neither shipped nor a player's own is skipped when read and stays in storage, so
 * it comes back if the card or question returns in a later deck version.
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
  listPlayerQuestions(): Promise<CustomQuestion[]>;
  /**
   * Tidies and checks the text and each option, and enforces the player question limit. A change
   * that gives a stored question another format or fewer options also deletes its discoveries,
   * because its option ids would then mean something else.
   */
  savePlayerQuestion(draft: QuestionDraft): Promise<SaveResult<CustomQuestion, QuestionProblem>>;
  /** Also deletes the discoveries about the question. */
  deletePlayerQuestion(id: string): Promise<void>;
  /**
   * Oldest first. A discovery is skipped, and kept, when its question is neither shipped nor a
   * player question, or when it names an option the question does not offer now.
   */
  listDiscoveries(): Promise<Discovery[]>;
  /**
   * Stamps each draft with the time and stores it. A draft with the same key as a stored discovery
   * replaces it and goes to the end of the list. A draft that fails the core schema is skipped.
   */
  addDiscoveries(drafts: readonly NewDiscovery[]): Promise<void>;
  removeDiscovery(key: DiscoveryKey): Promise<void>;
  /** Deletes every discovery, including those for questions that are missing now. */
  clearDiscoveries(): Promise<void>;
  /**
   * True once after the database was unreadable and was made again empty, so a screen can say so.
   * It is true again only after another recovery.
   */
  takeRecoveryNotice(): boolean;
};
