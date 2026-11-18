import { z } from 'zod';

export const categoryIds = ['c1', 'c2', 'c3', 'c4'] as const;
export type CategoryId = (typeof categoryIds)[number];

export function isCategoryId(value: string): value is CategoryId {
  return categoryIds.some((categoryId) => categoryId === value);
}

export type Category = {
  id: CategoryId;
  rank: 1 | 2 | 3 | 4;
  /** Forfeit units for passing a card in this category. */
  penalty: number;
};

/** From mildest to boldest. The penalty grows by one unit for each step up. */
export const categories: readonly Category[] = [
  { id: 'c1', rank: 1, penalty: 1 },
  { id: 'c2', rank: 2, penalty: 2 },
  { id: 'c3', rank: 3, penalty: 3 },
  { id: 'c4', rank: 4, penalty: 4 },
];

export const levelIds = ['l1', 'l2', 'l3'] as const;
export type LevelId = (typeof levelIds)[number];

export type Level = {
  id: LevelId;
  categories: readonly CategoryId[];
};

export const levels: readonly Level[] = [
  { id: 'l1', categories: ['c1'] },
  { id: 'l2', categories: ['c1', 'c2'] },
  { id: 'l3', categories: ['c1', 'c2', 'c3', 'c4'] },
];

export function categoriesForLevel(levelId: LevelId): readonly CategoryId[] {
  return levels.find((level) => level.id === levelId)?.categories ?? [];
}

type ErrorContext = { code: string; input?: unknown };

function showValue(input: unknown): string {
  return typeof input === 'string' ? input : JSON.stringify(input);
}

function oneOf<const Values extends readonly [string, ...string[]]>(field: string, values: Values) {
  const expected = values.length === 2 ? values.join(' or ') : `one of ${values.join(', ')}`;
  return z.enum(values, {
    error: (issue) =>
      issue.input === undefined
        ? `${field} is required`
        : `unknown ${field} "${showValue(issue.input)}", expected ${expected}`,
  });
}

function text(field: string) {
  return z
    .string({
      error: (issue: ErrorContext) =>
        issue.input === undefined ? `${field} is required` : `${field} must be text`,
    })
    .trim()
    .min(1, `${field} must not be empty`);
}

function objectError(issue: ErrorContext & { keys?: string[] }) {
  if (issue.code === 'unrecognized_keys') {
    return `unrecognised field "${(issue.keys ?? []).join('", "')}"`;
  }
  return issue.code === 'invalid_type' ? 'expected an object' : undefined;
}

export const cardKinds = ['solo', 'together'] as const;
export type CardKind = (typeof cardKinds)[number];

/**
 * `effect` is for cards that change the turn and `source` tells a shipped card from one a player
 * wrote. Neither is used yet.
 */
export const cardSchema = z.strictObject(
  {
    id: text('id'),
    category: oneOf('category', categoryIds),
    kind: oneOf('kind', cardKinds),
    text: text('text'),
    effect: z.string().optional(),
    source: oneOf('source', ['shipped', 'player']).optional(),
  },
  { error: objectError },
);
export type Card = z.infer<typeof cardSchema>;

export const deckSchema = z
  .strictObject(
    {
      id: text('id'),
      version: z
        .number({
          error: (issue) =>
            issue.input === undefined ? 'version is required' : 'version must be a number',
        })
        .int('version must be a positive whole number')
        .positive('version must be a positive whole number'),
      cards: z.array(cardSchema, {
        error: (issue) =>
          issue.input === undefined ? 'cards is required' : 'cards must be a list',
      }),
    },
    { error: objectError },
  )
  .superRefine((deck, context) => {
    const firstIndexById = new Map<string, number>();
    deck.cards.forEach((card, index) => {
      const firstIndex = firstIndexById.get(card.id);
      if (firstIndex === undefined) {
        firstIndexById.set(card.id, index);
        return;
      }
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'id'],
        message: `duplicate id, first used by cards[${firstIndex}]`,
      });
    });
  });
export type Deck = z.infer<typeof deckSchema>;

export type ParseDeckResult = { success: true; deck: Deck } | { success: false; errors: string[] };

function cardIdAt(input: unknown, index: number): string | undefined {
  if (typeof input !== 'object' || input === null || !('cards' in input)) return undefined;
  const { cards } = input;
  if (!Array.isArray(cards)) return undefined;
  const card: unknown = cards[index];
  if (typeof card !== 'object' || card === null || !('id' in card)) return undefined;
  return typeof card.id === 'string' && card.id !== '' ? card.id : undefined;
}

function locate(input: unknown, path: PropertyKey[]): string {
  const [section, index] = path;
  if (section !== 'cards' || typeof index !== 'number') return 'deck';
  const id = cardIdAt(input, index);
  return id === undefined ? `cards[${index}]` : `cards[${index}] (id "${id}")`;
}

/** Checks an unknown value against the deck format and says what is wrong, card by card. */
export function parseDeck(input: unknown): ParseDeckResult {
  const result = deckSchema.safeParse(input);
  if (result.success) return { success: true, deck: result.data };
  return {
    success: false,
    errors: result.error.issues.map((issue) => `${locate(input, issue.path)}: ${issue.message}`),
  };
}
