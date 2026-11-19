import { z } from 'zod';

import {
  categoryIds,
  objectError,
  oneOf,
  showValue,
  tagsSchema,
  text,
  type ErrorContext,
} from './contentModel';

function list(field: string) {
  return {
    error: (issue: ErrorContext) =>
      issue.input === undefined ? `${field} is required` : `${field} must be a list`,
  };
}

export const questionFormats = ['ifYou', 'neverHave', 'guess', 'eitherOr', 'secretMatch'] as const;
export type QuestionFormat = (typeof questionFormats)[number];

/** Topic names live in `content`, typed by these ids. */
export const topicIds = ['t1', 't2', 't3', 't4', 't5', 't6'] as const;
export type TopicId = (typeof topicIds)[number];

const optionSchema = z.strictObject(
  { id: text('option id'), text: text('option text') },
  { error: objectError },
);
export type QuestionOption = z.infer<typeof optionSchema>;

function optionsSchema(size: 'twoToFour' | 'two') {
  const base = z.array(optionSchema, list('options'));
  const sized =
    size === 'two'
      ? base.length(2, 'options must have exactly 2 entries')
      : base.min(2, 'options must have 2 to 4 entries').max(4, 'options must have 2 to 4 entries');
  return sized.superRefine((options, context) => {
    const seenIds = new Set<string>();
    for (const option of options) {
      if (seenIds.has(option.id)) {
        context.addIssue({ code: 'custom', message: `option id "${option.id}" is used twice` });
      }
      seenIds.add(option.id);
    }
  });
}

const sharedShape = {
  id: text('id'),
  category: oneOf('category', categoryIds),
  topic: oneOf('topic', topicIds),
  source: oneOf('source', ['shipped', 'player']),
};

const ifYouSchema = z.strictObject(
  { ...sharedShape, format: z.literal('ifYou'), text: text('text') },
  { error: objectError },
);
const neverHaveSchema = z.strictObject(
  { ...sharedShape, format: z.literal('neverHave'), text: text('text') },
  { error: objectError },
);
const guessSchema = z.strictObject(
  {
    ...sharedShape,
    format: z.literal('guess'),
    text: text('text'),
    options: optionsSchema('twoToFour'),
  },
  { error: objectError },
);
const eitherOrSchema = z.strictObject(
  {
    ...sharedShape,
    format: z.literal('eitherOr'),
    text: text('text').optional(),
    options: optionsSchema('two'),
  },
  { error: objectError },
);
const secretMatchSchema = z.strictObject(
  { ...sharedShape, format: z.literal('secretMatch'), text: text('text'), tags: tagsSchema },
  { error: objectError },
);

function formatError(issue: ErrorContext & { input?: unknown }) {
  const format =
    typeof issue.input === 'object' && issue.input !== null && 'format' in issue.input
      ? issue.input.format
      : undefined;
  if (format === undefined) return 'format is required';
  return `unknown format "${showValue(format)}", expected one of ${questionFormats.join(', ')}`;
}

export const questionSchema = z.discriminatedUnion(
  'format',
  [ifYouSchema, neverHaveSchema, guessSchema, eitherOrSchema, secretMatchSchema],
  { error: (issue) => (issue.code === 'invalid_union' ? formatError(issue) : objectError(issue)) },
);
export type Question = z.infer<typeof questionSchema>;

export const questionDeckSchema = z
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
      questions: z.array(questionSchema, list('questions')),
    },
    { error: objectError },
  )
  .superRefine((deck, context) => {
    const firstIndexById = new Map<string, number>();
    deck.questions.forEach((question, index) => {
      const firstIndex = firstIndexById.get(question.id);
      if (firstIndex === undefined) {
        firstIndexById.set(question.id, index);
        return;
      }
      context.addIssue({
        code: 'custom',
        path: ['questions', index, 'id'],
        message: `duplicate id, first used by questions[${firstIndex}]`,
      });
    });
  });
export type QuestionDeck = z.infer<typeof questionDeckSchema>;

export type ParseQuestionDeckResult =
  { success: true; deck: QuestionDeck } | { success: false; errors: string[] };

function questionIdAt(input: unknown, index: number): string | undefined {
  if (typeof input !== 'object' || input === null || !('questions' in input)) return undefined;
  const { questions } = input;
  if (!Array.isArray(questions)) return undefined;
  const question: unknown = questions[index];
  if (typeof question !== 'object' || question === null || !('id' in question)) return undefined;
  return typeof question.id === 'string' && question.id !== '' ? question.id : undefined;
}

function locate(input: unknown, path: PropertyKey[]): string {
  const [section, index] = path;
  if (section !== 'questions' || typeof index !== 'number') return 'deck';
  const id = questionIdAt(input, index);
  return id === undefined ? `questions[${index}]` : `questions[${index}] (id "${id}")`;
}

/** Checks an unknown value against the question deck format and names each problem by question. */
export function parseQuestionDeck(input: unknown): ParseQuestionDeckResult {
  const result = questionDeckSchema.safeParse(input);
  if (result.success) return { success: true, deck: result.data };
  return {
    success: false,
    errors: result.error.issues.map((issue) => `${locate(input, issue.path)}: ${issue.message}`),
  };
}

/** Question ids must be unique across every question deck the app ships. Each repeat is listed once. */
export function findDuplicateQuestionIds(decks: readonly QuestionDeck[]): string[] {
  const seenIds = new Set<string>();
  const repeatedIds = new Set<string>();
  for (const deck of decks) {
    for (const question of deck.questions) {
      if (seenIds.has(question.id)) repeatedIds.add(question.id);
      seenIds.add(question.id);
    }
  }
  return [...repeatedIds];
}

const playerQuestionIdPattern =
  /^pq-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const playerShape = {
  id: z.string().regex(playerQuestionIdPattern, 'id must be "pq-" followed by a UUID'),
  source: z.literal('player', { error: 'source must be player' }),
};

/**
 * A player-written question. There is no `secretMatch` variant, because a written item would tell
 * the partner what its writer wants.
 */
export const customQuestionSchema = z.discriminatedUnion(
  'format',
  [
    ifYouSchema.extend(playerShape),
    neverHaveSchema.extend(playerShape),
    guessSchema.extend(playerShape),
    eitherOrSchema.extend(playerShape),
  ],
  { error: (issue) => (issue.code === 'invalid_union' ? formatError(issue) : objectError(issue)) },
);
export type CustomQuestion = z.infer<typeof customQuestionSchema>;

const questionId = text('question id');

const matchShape = {
  kind: z.literal('match'),
  questionId,
  /** `maybe` when at least one partner said maybe. It never says which one. */
  strength: oneOf('strength', ['yes', 'maybe']),
};
const agreeShape = { kind: z.literal('agree'), questionId, optionId: text('option id') };
const answerShape = {
  kind: z.literal('answer'),
  questionId,
  optionId: text('option id'),
  answererName: text('answerer name'),
};

const dateShape = { date: z.iso.datetime({ error: 'date must be a date and time' }) };

/** What an engine returns. The app adds the date when it saves the entry. */
export const newDiscoverySchema = z.discriminatedUnion('kind', [
  z.strictObject(matchShape),
  z.strictObject(agreeShape),
  z.strictObject(answerShape),
]);
export type NewDiscovery = z.infer<typeof newDiscoverySchema>;

export const discoverySchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...matchShape, ...dateShape }),
  z.strictObject({ ...agreeShape, ...dateShape }),
  z.strictObject({ ...answerShape, ...dateShape }),
]);
export type Discovery = z.infer<typeof discoverySchema>;
