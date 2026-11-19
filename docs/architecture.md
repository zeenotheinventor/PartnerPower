# Architecture

Get Freak is a mobile app of games for couples to connect with each other, played together on
one phone. This document says how the code is laid out and why. It covers the first two milestones
in detail and names the decisions later milestones depend on.

The Linear tickets under the `FRK` team are the spec for what to build. This document is the spec
for how. Change it in the same pull request as any change that departs from it.

## Principles

1. **One phone, no server.** There are no accounts and no backend. The app makes no network calls
   in the first two milestones.
2. **Rules are pure.** Everything with a branch lives in a core package with no React, React Native
   or Expo imports. The app renders state and sends actions.
3. **Content is data.** Card text, question text and every display name live in a content package,
   apart from the code. Code refers to them by neutral ids.
4. **Nothing personal leaves the device.** What players type or answer never appears in logs, error
   reports or analytics.
5. **Built for several games.** The hub and the core are shaped around a list of games from the
   first commit.

## Stack

| Concern        | Choice                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Runtime        | Node 26, pnpm                                                                                                                |
| App            | Expo SDK 57, React Native 0.86, React 19, TypeScript in strict mode                                                          |
| Navigation     | Expo Router, file-based                                                                                                      |
| Press feedback | `expo-audio` for the button sounds and `expo-haptics` for the haptics. Both are native modules.                              |
| Characters     | Code-drawn vector art: `react-native-svg` (native) with Reanimated. See Characters below                                     |
| Press effects  | `react-native-reanimated`, with plain views for every shape. No other native module.                                         |
| Styling        | NativeWind utilities over design tokens, in a light and a dark theme                                                         |
| Fonts          | Baloo 2 and Nunito, bundled with the app through `expo-font`                                                                 |
| Storage        | `expo-sqlite` (SQLCipher build) for what players write, its key-value store for settings, `expo-secure-store` for the key    |
| Validation     | Zod, in the core package                                                                                                     |
| Tests          | Jest with `jest-expo` and React Native Testing Library for the app, Jest with `@swc/jest` for `core`, `content` and `tokens` |
| Checks         | ESLint flat config, Prettier, `tsc --noEmit`                                                                                 |
| CI             | GitHub Actions                                                                                                               |

There is no global state library. See State below.

## Repository layout

A pnpm workspace. Packages are consumed as TypeScript source. There is no `dist/` and no build step
between them.

```
apps/
  mobile/              Expo app: routes, screens, components, storage
packages/
  core/                game rules, types, validation. Pure TypeScript.
  content/             decks, display names and user-facing copy. Data only.
  tokens/              design tokens: colour, type, spacing, radius
tools/                 data shared by the checks, such as the raw colour pattern
docs/
  architecture.md      this file
  compliance.md        the store review: rules, ratings, privacy answers, listing and review notes
  decisions/           one file per area for decisions a ticket made
```

### Import rules

| Package       | May import                                                               |
| ------------- | ------------------------------------------------------------------------ |
| `core`        | nothing from the workspace, and nothing from React, React Native or Expo |
| `content`     | types and validators from `core`                                         |
| `tokens`      | nothing                                                                  |
| `apps/mobile` | all three packages                                                       |

ESLint enforces these with import restrictions. Nothing but `apps/mobile` may import `tokens`. A
test in `core` and a test in `tokens` fail if a React or Expo import appears there.

## Games

Each game has a neutral id. The first two are `dares` and `questions`. A game is registered once:

```ts
type GameId = 'dares' | 'questions';

interface GameEntry {
  id: GameId;
  status: 'available' | 'comingSoon';
  entryRoute: string;
}
```

`core` exports the entries as one ordered list, `gameEntries`. The hub renders that list. Titles and
descriptions come from `content`, in `displayNames`, which is keyed by game id and typed from
`GameId`, so a registered game without a title and description fails typecheck.

The hub joins each entry with its names and hands the result to a list component that knows nothing
about any particular game. An available game's tile opens its `entryRoute`: Freak or Drink opens
its setup, and Drink If opens its own home. A coming soon game's tile is disabled and carries a
marker. Amara waves above the tiles and says the greeting in a speech bubble. Each tile can take a
decoration, and the hub gives the dares tile Mei and the questions tile Theo, as head crops.

Adding a game means adding an entry, its names in `content`, a route group registered behind the
entry guard, and a core module. The hub layout does not change.

## Content model

Categories and levels are ordered and referred to by id. Their names are content.

```ts
type CategoryId = 'c1' | 'c2' | 'c3' | 'c4'; // c1 is the mildest, c4 the boldest
type LevelId = 'l1' | 'l2' | 'l3';

interface Category {
  id: CategoryId;
  rank: 1 | 2 | 3 | 4;
  penalty: number; // forfeit units for passing a card in this category
}

interface Level {
  id: LevelId;
  categories: CategoryId[]; // l1: c1. l2: c1, c2. l3: c1 to c4.
}

type CardKind = 'solo' | 'together';

type CardEffect =
  | { type: 'timer'; seconds: number } // whole seconds, 5 to 120
  | { type: 'vibrate'; seconds: number }; // whole seconds, 1 to 30

interface Card {
  id: string;
  category: CategoryId;
  kind: CardKind;
  text: string;
  effect?: CardEffect;
  tags?: string[]; // 1 to 3 interest tags, shipped dares only
  source: 'shipped' | 'player';
}

interface Deck {
  id: string;
  version: number;
  cards: Card[];
}
```

`core` owns these types, the ordered category and level lists, `categoriesForLevel`, and a Zod
schema for `Deck`. The types are derived from the schema where it defines them. `parseDeck` checks
an unknown value against the schema and returns every problem as a message that names the card by
index and id, for example `cards[3] (id "card-4"): unknown category "c9"`. Duplicate card ids in a
deck fail in the schema, not only in a test. Penalties are 1 to 4 for c1 to c4.

`findDuplicateCardIds` checks that card ids are unique across every deck the app ships. The starter
deck is a data file, `packages/content/src/decks/starter.json`, and `decks.ts` runs it through
`parseDeck` at import time, so an invalid deck fails loudly. Tests require at least 30 cards in each
category, at least 8 of them `together` cards, and card text of 140 characters or fewer.

`content` exports `decks` as data, `categoryNames` and `levelNames`, typed by id so a missing name
fails typecheck, and `displayNames` for games. A test in `content` validates every deck against the
schema and checks that card ids are unique across all decks.

A card's `effect` is a typed union. A value that does not match fails `parseDeck` with a message
that names the card, for example `cards[2] (id "card-3"): timer seconds must be a whole number from
5 to 120`. `source` is required: every shipped card carries `shipped`, and a card a player wrote
carries `player`. `tags` is optional, so player cards and stored data stay valid, and it holds 1 to 3
plain strings, because `core` cannot import the vocabulary from `content`.

### Player-written cards

Text rules live in `cardText.ts` and hold no copy. `tidyCardText` trims text and turns each run of
spaces, tabs and line breaks into one space. `checkCardText(text, otherTexts)` takes tidied text and
returns problem codes: `empty`, `tooLong` (over 140 characters) and `duplicate` (the same as one of
`otherTexts`, ignoring case and spacing). Screens map the codes to messages from `content`.

The base rules are shared. The shipped deck test and `playerCardSchema` both use `checkCardText`.
The editorial rules (no dashes or semicolons, no gendered words, no forfeit word, ids numbered by
category) stay in the shipped deck test and do not apply to player cards.

- `playerCardSchema`: id `p-` followed by a UUID, category, kind, text that passes `checkCardText`
  on its own (stored tidied), `source: 'player'`, and no effect.
- `customDeckSchema`: id, a name of 1 to 30 characters after trimming, and a list of card ids with
  no repeats and at most 200 entries.
- `limits`: 140 characters per card, 300 player cards, 20 custom decks, 200 cards per custom deck,
  30 characters per deck name.
- `surpriseIds`: `mystery`, `jump`, `swap`, `choice`, `timer`, `freePass`. `content` types the
  surprise names by these ids.
- `withoutUnsupportedEffects(deck, { vibrate })` returns the deck without the cards whose effect
  the phone cannot play. Today that means `vibrate` cards on a phone that cannot vibrate.

User-facing copy also lives in `content`, in one module, in British English. The privacy policy is
a separate export, `privacyPolicy`, as headed sections of plain paragraphs. Screens never hold
string literals for copy. A line with a value in it carries a marker such as `{name}`, and
`fillCopy` fills it. Its type reads the markers from the line, so a missing or misspelled value
fails typecheck.

## Questions game

The second game, `questions`, is built from questions instead of cards. This section is the model
that the round engine, the secret match engine, storage and the content tickets build on. It has no
UI. It lives in `core`, in `questionModel.ts`, and reuses the categories and levels above. A level
picks the categories in play exactly as for dares, and the penalty for a question is its
category's penalty.

```ts
type QuestionFormat = 'ifYou' | 'neverHave' | 'guess' | 'eitherOr' | 'secretMatch';
type TopicId = 't1' | 't2' | 't3' | 't4' | 't5' | 't6';

type Question = {
  id: string;
  category: CategoryId;
  topic: TopicId;
  source: 'shipped' | 'player'; // required
} & (
  | { format: 'ifYou' | 'neverHave'; text: string }
  | { format: 'guess'; text: string; options: QuestionOption[] } // 2 to 4 options
  | { format: 'eitherOr'; text?: string; options: QuestionOption[] } // exactly 2 options
  | { format: 'secretMatch'; text: string; tags: string[] } // 1 to 3 tags
);

type QuestionOption = { id: string; text: string }; // id is unique within its question
```

Four formats are played in a round and `secretMatch` is played in its own session. Format ids,
topic ids and option ids are neutral. Discoveries refer to an option by its id, so content can
reorder options safely. `tags` is a list of plain strings for now. The interest tags ticket adds
the vocabulary that limits it.

A question deck is `{ id, version, questions }`. `parseQuestionDeck` checks an unknown value against
the Zod schema and names each bad question by index and id, as `parseDeck` does, for example
`questions[2] (id "q-3"): options must have 2 to 4 entries`. The schema rejects duplicate ids in a
deck, a wrong number of options, a repeated option id, and `tags` on any format but `secretMatch`
(every question object is strict, so a field a format does not have is an unrecognised field).
`findDuplicateQuestionIds` checks ids across every question deck the app ships.

A `Discovery` is a saved entry. Each kind carries the question id and a date:

| Kind     | Meaning                                                                           | Fields                     |
| -------- | --------------------------------------------------------------------------------- | -------------------------- |
| `match`  | A secret match item both partners rated yes or maybe                              | `strength`: `yes`, `maybe` |
| `agree`  | A would you rather question where both picked the same option                     | `optionId`                 |
| `answer` | A guess your partner question, with the option the answerer picked and their name | `optionId`, `answererName` |

`maybe` means at least one partner said maybe. A match never says who. The date is an ISO date and
time string. Engines return a `NewDiscovery`, which is a discovery without the date, and the app
adds the date when it saves the entry.

`CustomQuestion` is the schema for a player-written question. It is the question schema with
`source: 'player'` and an id of `pq-` plus a UUID, as player dares use `p-`. It covers `ifYou`,
`neverHave`, `guess` and `eitherOr`. It has no `secretMatch`, because a written item would tell the
partner what its writer wants. The text rules for player text are applied where the question is
stored.

`content` holds one data file per format in `src/questions/`: `ifYou.json`, `neverHave.json`,
`guess.json`, `eitherOr.json` and `secretMatch.json`. `questions.ts` runs each through
`parseQuestionDeck` at import time and exports `questionDecks`, so a bad file fails loudly. Each
file ships at least 3 questions in every category. Question ids read `<format>-<category>-<number>`.
The text rules for cards (the card text limit, no gendered words, no forfeit word, no dashes or
semicolons) apply to every question text, option text and tag, and a test checks them with the same
helpers as the deck test.

Names are content, typed by id so a missing one fails typecheck. `topicNames` and
`questionFormatNames` are in `displayNames.ts`. The leads ("Drink if", "Never have I ever", "Would
you rather") are in `copy` as `questionLeads`, so question text holds only the clause after the
lead. The topics are t1 favourites, t2 turn-ons and turn-offs, t3 fantasies, t4 kinks and fetishes,
t5 history and t6 wishlist.

## Dare suggestions

A couple's secret match results suggest dares, all on the device. A shared vocabulary of interest
tags links the two sides. `content` holds it as `interestTags` in `src/interestTags.ts`, 29 short
lowercase words and hyphenated phrases covering activities, kit, places, roles and pace. Every
shipped dare carries 1 to 3 of these tags, every `secretMatch` item carries 1 to 3, and every tag
sits on at least 2 dares. `decks.ts` and `questions.ts` check each tag against the vocabulary at
import time through `findUnknownTags`, so an unknown tag fails loudly, and tests repeat the checks.
Player-written dares have no tags and are never suggested.

`core` takes tags as plain strings and does the ranking in `suggestions.ts`:

```ts
type MatchedItem = { strength: 'yes' | 'maybe'; tags: readonly string[] };

suggestDares(matches: MatchedItem[], cards: Card[], options?: { limit?: number; categories?: CategoryId[] }): Card[];
buildMatchesDeck(cards: Card[]): Deck; // id 'matches', version 1, at most 20 cards
canOfferMatchesDeck(suggestions: Card[]): boolean; // 5 or more
```

- Each tag takes the strength of the strongest match that carries it: 2 for `yes`, 1 for `maybe`.
- A dare scores the sum over its distinct tags. A dare that scores 0, or has no tags, is left out.
- Ranking is score high to low, then category c1 to c4, then id.
- `limit` defaults to 10. `categories`, when given, is applied before the limit.
- The function takes match tags, not discoveries. The caller looks up each match's item in the
  current content and passes its tags, so retagging content changes suggestions without touching
  stored data.
- The matches deck is built when needed and never stored. It holds the first 20 suggestions in
  rank order, and the screen offers it when there are at least 5 suggestions.

## Round engine

A round of the `dares` game is a reducer in `core`, in `round.ts`. It is pure: no React and no I/O.

```ts
type RoundSetup = {
  players: readonly [string, string];
  level: LevelId;
  enabledCategories: readonly CategoryId[];
  length: 10 | 20 | 'endless';
  seed: number;
};

type RoundAction =
  | { type: 'done' }
  | { type: 'pass' }
  | { type: 'removeCard' }
  | { type: 'disableCategory'; category: CategoryId }
  | { type: 'end' };

function startRound(setup: RoundSetup, deck: Deck): RoundState;
function reduceRound(state: RoundState, action: RoundAction): RoundState;
function summarise(state: RoundState): RoundSummary;
function isRoundOver(state: RoundState): boolean;
```

`startRound` throws an `Error` that says what is wrong when the setup is invalid: a player without a
name, no enabled category, an unknown category, a category outside the level, a category listed
twice, or a seed that is not a whole number. The order of `enabledCategories` does not matter.
The engine sorts it by rank. A deck with no cards in the enabled categories gives a round that is
already over.

`RoundState` is plain serialisable data. It holds the players, the enabled categories, the cards not
yet dealt, the seeded generator state, whose turn it is, the current card and a `history` of the
cards played. `current` is null when the round is over. Each history entry records the card, its
category and kind, the player who held the phone, and whether it was `done` or `passed`, which is
all that `summarise` needs. For the card in play, `current` carries two things for the screens:
`player`, who holds the phone, so the UI can show "pass the phone" when it changes, and
`steppingUp`, true for the first card in a higher category than the previous card, for the
"stepping up" screen.

Rules the engine owns:

- Cards are dealt only from enabled categories, and no card repeats in a round.
- Turns alternate between the two players, starting with the first. A `together` card does not
  consume a turn. The player whose turn it would have been plays the next solo card, and holds the
  phone for the together card.
- The round starts in the lowest enabled category and steps up as it progresses.
  - A round of 10 or 20 cards splits its card count across the enabled categories in rank order as
    evenly as possible, with any remainder going to the higher categories. Twenty cards over four
    categories is 5 each, and 10 over three is 3, 3, 4.
  - An endless round steps up one category every 5 cards, then stays in the highest enabled one.
    It ends by itself only when no unused card is left in any enabled category.
- If the category for a card has no unused card of the kind needed, the engine takes one from the
  next higher enabled category, then the next lower, nearest first. The preferred kind is tried in
  every category before the other kind. If no card is left anywhere, the round is over.
- A draw looks at the unused cards of the kind it wants in the category it is looking in. When both
  player cards and shipped cards are there, it takes a player card with a probability of one half,
  from the seeded generator. The generator is used for that only when both sources are present, so a
  deck with no player cards deals exactly as it did before for the same seed. Every other rule
  applies to player cards unchanged.
- Cards with a `timer` effect are left out of the normal deal. Only the timer surprise deals them.
- Every 5th card of the round (cards 5, 10, 15 and so on) is a `together` card when the category
  for that card has one, otherwise a `solo` card.
- A `together` card counts toward the round length. A card removed with `removeCard` does not.
- Passing a card costs the category's `penalty`, in drink units. The player holding the phone pays
  for a `solo` card. Passing a `together` card costs both players the penalty. A `together` card
  done counts as one done for each player.
- `removeCard` draws a replacement of the same kind from the same category at no cost, with the
  same player and the same place in the round, and keeps the removed card out of the round. If no
  replacement is left, the round is over.
- `disableCategory` returns the same state if the category is not enabled or if it is the last one
  enabled. Otherwise its cards leave the deal, and pacing carries on as if the category had never
  been there: each later position that belonged to it goes to the next higher enabled category, or
  the next lower one if none is higher. If the current card is in the disabled category it is
  replaced at no cost, as with `removeCard`.
- `end` finishes the round. Every action on a finished round returns the same state.
- All randomness comes from a seeded generator (mulberry32) whose state lives in `RoundState`. The
  app supplies the seed, so the same seed and actions always give the same round.

`summarise` gives, for each player, the name, the dares done and the drinks taken in penalty units.
It also gives the cards played, the categories reached from lowest to highest, and `boldest`: the
index of the player with more dares done, or `'tie'` when they are equal. A tie is not broken by
drinks.

The reducer never throws on a valid state and action. It returns the same state for an action that
does not apply.

### Surprises

`RoundSetup.surprises` is an optional list of the surprise types in play, from `surpriseIds`. Absent
or empty means surprises are off: `surprisePlan` is null, nothing extra is drawn, and the round deals
exactly as it did for the same seed and actions. An unknown type or a repeated one makes
`startRound` throw. The module is `surprises.ts` and the rules are in `round.ts`.

- **How many and where.** A round has one surprise in each block of 5 played cards (1 to 5, 6 to
  10, and so on). When a block's first card is dealt, the plan draws the surprise's offset in the
  block, from 0 to 3. In the first block it is 1 to 3, so card 1 never carries one. The 5th card
  of a block, the together slot, never does. Positions count played cards, so a skipped card does not
  move them.
- **Its own stream.** The plan (`surprisePlan`) holds the types still in play, the shuffle bag, the
  planned offset and its own generator state, seeded from the round seed. The plan never touches the
  main generator state, except when a surprise picks its card, so a round with surprises off is
  untouched. With surprises on, the normal cards after a surprise also differ from a round without
  them, because a surprise's card pick advances the main stream and removes a card from the pool.
- **Which type.** Types come from a shuffle bag, refilled with a seeded shuffle when empty, so every
  type appears before any repeats. A type that does not fit this slot is skipped and stays in the
  bag. If none fits, the block has no surprise. A type that can never fit again, because no enabled
  category has a card it could go on, is dropped from the plan, so later blocks still get other
  types. A free pass is never dropped, because a player who spends theirs becomes eligible again.
- **Where it goes.** A surprise goes on a plain `solo` card (no effect) from an enabled category, or
  for the timer, on a solo card with a `timer` effect. Timer cards are found by `isDealable`, which
  leaves them out of every normal deal.
- `current.surprise` is a `CurrentSurprise` and each history entry records its `surprise`.
  - `mystery { flipped }`: dealt face down. Until a `flip` action, `done`, `pass`, `removeCard` and
    `useFreePass` do nothing. Passing after the flip costs the penalty plus one, which `summarise`
    applies.
  - `jump`: the card comes from the next higher enabled category than the position's, at that
    category's penalty. Eligible only when that category has an unused plain solo card. Pacing
    carries on as if it had not happened.
  - `swap`: the other partner plays the card and pays if they pass. `turn` does not move, so the
    partner whose turn it was plays the next solo card. A solo card moves the turn only when the
    player who played it is the one whose turn it was.
  - `choice { chooser, options, chosen }`: two unused plain solo cards from the position's category
    are offered to the partner who is not playing. Both stay in `unused`. Until a `choose` action
    (index 0 or 1), `done`, `pass`, `removeCard` and `useFreePass` do nothing. Choosing removes the
    chosen card from `unused` and the other card goes back into the deal. While a choice is open,
    `current.card` is only a placeholder (`options[0]`), so screens must render `options`, not `card`.
  - `timer { seconds }`: an unused timer card from the position's category, at its penalty. The
    engine does not run the clock. The screen does.
  - `freePass`: the player holding the phone gets a pass, plays the card as normal, and holds at
    most one, so the type is not eligible for a player who already has one.
- **Using a free pass.** `useFreePass` resolves a solo card held by a player with a pass, with
  outcome `freePass`: no drink, no dare done, and the pass is spent. It does nothing on a together
  card, on an unflipped mystery or on an open choice. `RoundState.freePasses` holds one flag per
  player. Unused passes are cleared when the round ends.
- **Dropping a surprise.** `removeCard`, and a `disableCategory` that replaces the card, drop the
  surprise. The replacement is a plain card of the same kind for the same player. A free pass
  already given is kept. `end` and `disableCategory` always apply, including to a face down mystery
  and an open choice.

## Secret match

The secret match engine is `secretMatch.ts` in `core`. It is a pure reducer, separate from the round
engine, and has no drinks. Two partners rate the same items in private on one phone, and only the
items both rated yes or maybe are revealed. The engine keeps the privacy promise, so the screens
cannot leak what they are never given.

```ts
startSecretMatch(setup, questions): SecretMatchState; // throws on a bad setup or "too few items"
reduceSecretMatch(state, action): SecretMatchState;
viewSecretMatch(state): SecretMatchView; // the only thing screens read
secretMatchDiscoveries(state): NewDiscovery[]; // `match` entries, no dates, mild to bold
availableItemCount(setup, questions): number; // at most 12, for the intro's "too few items" state
```

The setup is two player names, a level, the enabled categories and topics, a seed and `avoidIds`,
the ids of items already matched. The session deals 12 items from the `secretMatch` questions in
the enabled categories and topics, or fewer when there are fewer. Fewer than 3 is an error whose
message starts "too few items". The 12 are split across the enabled categories as a 12 card dares
round is, with the extras going to the bolder ones, and the items are ordered mild to bold. Items
not on the avoid list are taken first, by the seeded generator. A short category is made up from
the others, fresh items before avoided ones. Avoided items still count in `availableItemCount`,
because they are the fallback.

Phases are `rating` (first pass), `handoff`, `rating` (second pass), `revealed`, and `stopped`.
Both passes see the same items in the same order. Actions are `rate` (`yes`, `maybe` or `no`, then
on to the next item), `back`, `startSecondPass` and `stop`. `back` steps to the previous item in
the current pass only. It does nothing on the first item, so it never reaches into the other
player's pass. `stop` works in a pass or at the handoff and wipes everything. An action that does
not apply to the phase returns the same state, including every action once the session is revealed
or stopped.

### Privacy rules

- Screens read only `viewSecretMatch`. In `rating` it gives the pass, the player's name, the
  current item, its position (from 1), the total, whether back is possible, and the current
  player's own rating for the item, which is set only after going back to it. It never holds
  the other player's ratings. Tests walk every phase and check that the views are identical
  whatever the first player rated.
- At the reveal the engine works out the matches and drops every individual rating. The revealed
  state is `{ phase, matches, total }` and nothing else. It holds no names and no ratings.
- A match is an item both rated yes or maybe. Its strength is `yes` when both said yes and `maybe`
  otherwise. Nothing says which partner said maybe. Swapping who said maybe gives an identical
  revealed state.
- An item with a no from either partner is not in the revealed state at all, so it is not
  mentioned.
- A partner can still infer that if they said yes and an item is not revealed, the other said no.
  That is the nature of the format, and the intro screen says so.
- `stop` keeps nothing. The session is in memory only, so leaving it discards it.

## Question round engine

A round of the `questions` game is a reducer in `core`, in `questionRound.ts`. It follows the dares
engine: pure, plain serialisable state, and a seeded generator in the state. The pacing rules that
both games share are in `pacing.ts`, and `round.ts` imports them from there.

```ts
type QuestionRoundSetup = {
  players: readonly [string, string];
  level: LevelId;
  enabledCategories: readonly CategoryId[];
  enabledFormats: readonly PlayableFormat[]; // at least one of ifYou, neverHave, guess, eitherOr
  enabledTopics: readonly TopicId[]; // at least one of t1 to t6
  length: 10 | 20 | 'endless';
  seed: number;
};

type QuestionRoundAction =
  | { type: 'answer'; answers: readonly [boolean, boolean] } // yes or no per player index
  | { type: 'pick'; optionId: string }
  | { type: 'next' }
  | { type: 'removeQuestion' }
  | { type: 'disableCategory'; category: CategoryId }
  | { type: 'end' };

function startQuestionRound(
  setup: QuestionRoundSetup,
  questions: readonly Question[],
): QuestionRoundState;
function reduceQuestionRound(
  state: QuestionRoundState,
  action: QuestionRoundAction,
): QuestionRoundState;
function summariseQuestionRound(state: QuestionRoundState): QuestionRoundSummary;
function isQuestionRoundOver(state: QuestionRoundState): boolean;
function questionTurnView(state: QuestionRoundState): QuestionTurnView | null;
function availableQuestionCount(setup: QuestionRoundSetup, questions: readonly Question[]): number;
```

`startQuestionRound` throws an `Error` that says what is wrong for an invalid setup, as `startRound`
does. It also checks the formats (at least one, known, not `secretMatch`, none twice), the topics
(at least one, known, none twice) and the length. It takes the questions as a list, so the app can
pass shipped and player-written questions together. Only questions in the enabled categories,
formats and topics are dealt, and each id is dealt at most once. `availableQuestionCount` counts
what the same setup could deal, so the setup screen can say when there are fewer than the round
length, with no rules of its own.

`current` carries `question`, `holder`, `other` and `steppingUp` as for dares, plus `stage`
(`answering`, `secondPick`, `revealed`), `firstPick` and `reveal`. The holder alternates every
question, starting with the first player. `next` deals the following question from `revealed`.

Screens read `questionTurnView(state)`, never `current.firstPick`. The view has everything a turn
screen needs (`question`, `holder`, `other`, `steppingUp`, `stage` and `reveal`) and leaves out the
holder's first pick, so no screen can show a private pick by mistake, including after a focus change
or a replaced question. It adds `pickLocked`, true while the stage is `secondPick`, so the screen can
say a pick is locked in without saying which. The first pick appears only inside `reveal`, once both
players have picked. It is null when the round is over.

Rules the engine owns:

- Pacing is the dares pacing: start in the lowest enabled category, split a 10 or 20 round across
  the enabled categories with the remainder going higher, and step up every 5 questions in an
  endless round.
- Formats mix evenly. The state keeps a bag of the enabled formats, shuffled with the seeded
  generator. Each question takes the next format from the bag, and the bag is refilled with a new
  shuffle when it is empty.
- If the target category has no unused question in the chosen format, the engine tries the other
  enabled formats in the same category, then the nearest higher category, then the nearest lower
  one, trying every enabled format in each. If nothing is left anywhere the round is over.
- A draw takes a player question with a probability of one half when it has unused player and
  unused shipped questions of the format in the category it is looking in, as for player dares. The
  generator is used for that only when both sources are present.
- `ifYou` and `neverHave` are answered openly. `answer` sets a yes or no for each player, and each
  yes drinks the category's penalty. No discovery is recorded.
- `eitherOr`: the holder picks, then the other player picks, with the same phone. The first pick is
  kept in `firstPick` and `reveal` stays null until both have picked. The same option means nobody
  drinks and an `agree` discovery. Different options mean both drink.
- `guess`: the holder answers about themselves, the phone is passed, and the other player guesses.
  A right guess is a point for the guesser. A wrong guess costs the guesser a drink. Either way an
  `answer` discovery is recorded for the holder.
- Discoveries are `NewDiscovery` values, without dates. The app adds the date when it saves them.
- A question counts as played when it is revealed, so ending the round at the reveal keeps it. A
  question that is in play but not yet revealed is not counted.
- `removeQuestion` replaces the question in play at no cost, with one of the same format and
  category (falling back as the draw does), and drops any first pick. It does nothing once the
  question is revealed. A skipped question is not played, so nobody drinks and it is not counted.
- `disableCategory` and `end` behave as in the dares engine. A category switched off at the reveal
  is switched off without replacing the revealed question.
- An action that does not apply to the stage, and every action on a finished round, returns the
  same state.

`summariseQuestionRound` gives, for each player, the name, drinks, guesses right and guesses made. It
also gives the questions played, the categories reached, how many `eitherOr` questions were played
and how many matched, `knowsBest` (the player with more right guesses, `'tie'`, or null when no
guess question was played) and the discoveries made in the round.

## App structure

```
apps/mobile/
  app/
    _layout.tsx          root layout: providers and the root navigator with the entry guard
    +not-found.tsx       sends an unknown path to the one screen that is open to the player
    index.tsx            hub
    settings.tsx         the sound and vibration settings
    welcome.tsx          entry confirmation, shown on first launch
    dev/kit.tsx          gallery of the UI kit, development builds only
    games/
      dares/
        _layout.tsx      holds the round for this route group
        setup.tsx
        play.tsx
        summary.tsx
        my-dares/
          index.tsx      the My dares list
          new.tsx        the dare editor, for a new dare
          [id].tsx       the dare editor, for a dare that is stored
      questions/
        _layout.tsx      holds the question round for this route group
        index.tsx        the Drink If home
        setup.tsx
        play.tsx
        summary.tsx      a stand-in until the Drink If summary replaces it
  components/ui/         the UI kit, including the Character and the SpeechBubble
  components/FontGate/   holds rendering until the bundled fonts are ready
  components/EntryStack/ the root navigator, with the entry guard
  settings/              the settings context, including the remembered player names and the sound and vibration switches
  personal/              the provider that gives screens the encrypted store of a couple's own dares, favourites and decks
  feedback/              the press feedback module: sound and haptic for each moment
  characters/            the art of the cast as pure data, one file for each character, with a README
  assets/sounds/         the button sounds, with a README about where they come from
  scripts/               `generateSounds.mjs`, which makes the sounds
  fonts/                 the font files the type scale uses
  tailwind/              turns the tokens into the Tailwind theme
  features/              screen-level components, one folder per game
  features/hub/          the hub: the first screen, with a tile for each game and a Settings button
  features/settings/     the settings screen
  features/round/        the round context for the dares route group
  features/roundSetup/   the round setup screen, with Mei in the header, or Nyx when one category is left on
  features/ownCards/     the player's own dares: the provider, the list screen, the editor and the dialog that confirms a delete
  features/roundPlay/    the play screen: the card, the step up, surprise reveal and pass the phone screens, the end round dialog, the press effects
  features/roundSummary/ the end of round summary screen, the player score block and the list of cards played
  features/questionRound/  the question round context for the questions route group
  features/questionsHome/  the Drink If home: Theo's line and the entries, listed in `homeEntries`
  features/questionsSetup/ the Drink If round setup screen
  features/questionsPlay/  the Drink If play screen and its turn views
  features/questionsSummary/ the Drink If round summary screen and its player score block
  features/welcome/      the entry confirmation screens
  features/dev/          development-only screens, such as the UI kit gallery
  storage/               the storage module: settings, secure storage, the install marker, clear everything
  lock/                  the lock service: the PIN, wrong PINs and their wait, and biometrics
```

### State

- **Round state** lives in a `useReducer` inside the game's route group layout and is shared through
  context. It wraps `reduceRound` from `core`. Leaving the route group discards it. The layout
  renders `RoundProvider` (`features/round`), and `useRound` gives `round` (undefined until a round
  has started), `startNewRound(setup, deck)`, which calls `startRound` and holds the result, and
  `dispatch` for a `RoundAction`. Setup builds the `RoundSetup` and the play route reads the round.
  The provider also keeps `lastStart`, the setup and deck the last round was started from, in
  memory only, so the summary can start another round like it. It goes with the round when the
  route group is left.
- **Own dares** are held once for the `games/dares` route group by `OwnCardsProvider`
  (`features/ownCards`), above the round provider. `useOwnCards` gives `isLoading`, `cards`,
  `hasReachedLimit`, `save(draft)` and `remove(id)`. It reads the list from the repository of
  `usePersonalData`, and a save or a delete goes through the repository and then reads the list again,
  so setup, the list and the editor always agree. `save` returns the repository's result, so a
  screen maps the problem codes to messages. Nothing in it logs.
- **Question round state** works the same way for `questions`. The layout renders
  `QuestionRoundProvider` (`features/questionRound`), and `useQuestionRound` gives `round`,
  `startNewRound(setup, questions)`, which calls `startQuestionRound`, `lastStart` and `dispatch`
  for a `QuestionRoundAction`. It holds the question list it was started from in place of a deck.
- **Settings**, such as the entry confirmation and the remembered player names, are read from
  storage once at launch and exposed through a small settings context, `settings`. Saving the names
  never rejects: a failed write is ignored and the names still count for that session. The
  provider takes the storage to use as a prop, so tests pass an in-memory one. A failed read or an
  invalid stored
  value counts as not confirmed. If the write on confirming fails, the player is still let in for
  that session and is asked again at the next launch. Nothing in it logs.
- The sound and vibration switches, `soundOn` and `hapticsOn`, are settings too. Both are on until the
  player turns one off, and a missing or invalid stored value counts as on. `setSoundOn` and
  `setHapticsOn` never reject, and a failed write still holds for that session.
- There is no global store. If a later milestone needs state shared across games, add it then and
  record the choice here.

### My dares

A couple write their own dares and deal them in with the starter deck. The code is in
`features/ownCards`. A dare is a `PlayerCard`, stored by the personal repository, so tidying the text
and the checks against the shipped deck and the player's other dares are the repository's, not the
screen's. The screens map the problem codes to the messages in `content`, in `cardProblemMessage`.

- **Setup.** `RoundSetupScreen` has a `My dares` row under the names: a pressable card named "My dares,
  12 written" that opens the list. With at least one dare, a `Mix in my dares` switch sits under it,
  in a bordered box. It is on each time setup opens, is not remembered, and applies to the starter
  deck only. Start deals from `withOwnCards(starterDeck, dares)` when it is on and from the starter
  deck alone when it is off. A player's dare can be in any category, and the level decides which are
  dealt, as for shipped cards.
- **List** (`my-dares`). The title with how many are written, then `Write a dare`, then the dares
  grouped by category in rank order. Each group has a category chip and its count as a heading, and
  each dare is a pressable card in its category colour, with a Together chip where it applies, that
  opens it for editing. An empty list invites the first dare. At 300 dares (`limits.playerCards`)
  `Write a dare` is disabled and the line under it says why. If the store reported that it could not
  open saved data and started fresh, a notice shows once, on the next visit to the list.
- **Editor** (`my-dares/new`, `my-dares/[id]`). A multiline `TextField` for the dare with a count against
  140, four category chips (a radio group named Category), and a `SegmentedControl` for "For your
  partner" or "Together". `Save dare` is pinned in the `Screen` footer. It is off while the field is
  empty and until the store has loaded. A rejected save shows the message under the field, reads it
  with the field and announces it. A dare that is being edited also has `Delete dare` at the end of
  the form, which asks with the kit `Dialog`, then deletes through the repository, which also takes
  the dare out of the favourites and the decks, and goes back.
- **Not logged.** No dare text is logged or sent anywhere.

### Summary screen

`features/roundSummary/RoundSummaryScreen` shows `summarise` of the round from `useRound()`. Nothing
on it is stored or logged, except that a player can keep a played card as a favourite (below).

- The heading is "Round over!", with a line giving the cards played and the categories reached,
  in the singular for one. Each player has a `PlayerScore` block that reads as one group, such as
  "Alex, 8 dares done, 2 drinks, boldest". The boldest player's block carries a "Boldest" badge.
  A tie has no badge, and its line says so. Tyler stands above the scores, celebrating, or shocked
  for a tie, with the line as his speech bubble directly above him. There is no confetti yet.
- The badge is a static `Chip` with the `accent` option, like the Together chip. It fills with the
  accent colour and sets its small text in `on-accent-small`. The boldest block's depth edge stays
  `accent-deep`, since an edge carries no text.
- Play again starts a round from `lastStart` with the same players, level, categories, length and
  deck, and a new seed from `randomSeed`. It then replaces the summary with the play route. The
  play screen is a new screen, so it does not read the old round as finished.
- Settings goes back to setup, which is still mounted under the summary and so still shows the
  level, categories, length and names of the last round. Home goes to the hub with `dismissTo`,
  which leaves the route group and discards the round and `lastStart`. A new visit to the game
  starts setup at its defaults. The names are still remembered, because they are settings.
- Below the buttons, `PlayedCards` lists the round's cards under the heading "This round's dares",
  in the order they were played. Each is a static `Card` with `grouped={false}` and the card's
  category, so the text and the control are read separately. It holds the category `Chip`, the name
  of the player who played it (a together card has an accent Together chip and no name), the card
  text and a `FavouriteToggle`. Skipped cards are left out and free pass cards are listed. The text
  comes from `lastStart.deck`, and a played card the deck no longer has is left out. The list is
  part of the scrolling `Screen`, because a round is short and the design says so. The three
  buttons sit above it so they stay in reach on a long round.
- A favourite is turned on or off at once and written through `usePersonalData().repository`
  (`setFavourite`). One card's writes run in turn, so two quick presses cannot race. When a card has no
  write left, its control shows what the store holds, which is the last write that went through. If
  the favourites cannot be read, every control starts off. A failed write shows "Couldn't save that
  favourite. Try again." under that card as a polite live region with the alert role, and announces it on iOS with
  `AccessibilityInfo.announceForAccessibility`. One message shows at a time. It clears when that
  control next changes. The list reads the favourites once the store has loaded, and a press does
  nothing before then, because a write to the placeholder store is lost. Only a favourite's card
  id is kept. The round, the players and the card text are never stored.
- Going back by the system back button or the iOS swipe goes to setup, as Settings does.
- The round complete haptic fires when the summary first shows, once for the round. The
  screen guards it, keyed on the finished round object in a module level `WeakSet`, so a render, an
  effect that runs again or a remount of the same round does not fire it twice. It fires only for a
  round that is over, because Play again starts the next round while the summary is still up. It fires the same
  way whether the round ended by itself or from End round, because both end at this screen. Play
  again replaces the screen, and the next summary is a new round with its own single haptic.

### Play screen

`features/roundPlay/RoundPlayScreen` reads the round from `useRound()` and sends `done`, `pass`,
`removeCard`, `disableCategory` and `end`. The card number is `history.length + 1`, and the penalty is the category's `penalty`.

- Each card can come with three screens before it, in this order. If `current.steppingUp` is true,
  the step up screen names the new category and what passing now costs. Then, if the card carries a
  surprise, the `SurpriseView` reveal names it. Then, if the player who holds the phone is not the
  one who held it for the previous card, or there was no previous card, the pass the phone screen
  names who receives it. Then the card shows. A category jump's reveal takes the place of the step
  up screen, and so does the reveal of a mystery dare that is still face down. These screens are state of the play screen, kept with the card number they belong to,
  and are not routes.
- Nyx says the step up line in a speech bubble on the step up screen. Mei's head peeks over the top
  edge of the card on the card view, outside the flip of a mystery dare. Both are decorative.
- A `together` card uses the same card view with "Both of you" for the turn and a penalty line that
  says both drink. The card is edged in the accent colour with the accent depth edge, in place of
  the category colour, and has a Together chip above the category chip and a line naming both
  players. The buttons read "We did it" and "We drink", and send the same `done` and `pass`
  actions. The core already charges both players on a pass and keeps the turn order. The accent
  edge and chip are the `accent` option of `Card` and `Chip`.
- **Surprises.** Setup has a "Surprises" `Toggle`, on each time setup opens and not remembered. When
  it is on, Start passes `playableSurprises` as `RoundSetup.surprises`, and when it is off it passes
  an empty list. `playableSurprises` (`features/roundPlay/playableSurprises.ts`) is the list of
  types this screen can show, which is all six: `mystery`, `jump`, `swap`, `choice`, `timer` and
  `freePass`. The play screen owns it, so a type is added there when the screen learns to show it
  and setup does not change. A card carrying a
  type that is not on the list plays as a plain card. With surprises off, nothing below shows.
  - **Reveal.** `SurpriseView` is a full screen state like `SteppingUpView`. It shows "Surprise!",
    the surprise's name from `surpriseNames` as a heading in an accent pill, the rule line from
    `copy.roundPlay.surpriseRule` filled with the name of the player the card is for, the category
    and its cost, and the turn line. Only a category jump adds the step up markers
    (`CategoryMarkers`, shared with `SteppingUpView`). Its button is "Bring it".
  - **Partner's choice.** `current.player` is the player and `surprise.chooser` is their partner. The
    order is step up, reveal, pass the phone to the chooser, `ChoiceView`, pass the phone to the
    player, card. The first pass is skipped when the chooser held the phone for the last card, which
    is the same `phoneChanges` rule as every other pass. The second always shows, even if it should
    not be needed, because it is what keeps the dare that was not picked from the player. The reveal
    rule line names the chooser and the player. `ChoiceView` has the same top bar as the card view
    (`TurnTopBar`: End round, the count and the progress bar), a heading that says whose dare it is,
    and the two dares as pressable `Card`s in the category colour, stacked. Each is one `button`
    named by its text, with the category chip and no penalty line. Pressing one sends `choose` with
    its index, which makes it the card in play, and the screen goes on to the second pass. That
    screen tells the chooser to look away. The chosen card then plays as normal, with the surprise
    chip and its category's penalty, and the other dare stays in the deal. The card text of the dare
    that was not picked is never in the tree after the pick. "Not this one" and Done and Pass do not
    show while a dare is being picked, and End round does.
  - **Timer.** A timer card shows a kit `Countdown` between the card and the buttons, started when
    the card view first shows, so not on the reveal or the pass the phone screen. `TurnView` takes
    the clock's start from `Date.now()` when it mounts. A timer card always comes after its reveal,
    which unmounts the card view, so each one has its own clock. Done is disabled until the countdown ends, with
    "Keep going" in muted caption text under the buttons. At zero Done opens, the hint reads "Time's
    up" and `timerEnd` is called once. Pass and "Not this one" work at any time, and answering or
    skipping takes the card away, which stops the clock. Cancelling the End round dialog or the sheet
    does not stop it. The clock runs on real time, so the background and a locked screen do not
    pause it.
  - **Role swap.** `current.player` is the partner who now plays, so the reveal, the pass the phone
    screen, the turn line and the penalty all name that partner. If they already hold the phone,
    there is no pass the phone screen.
  - **Surprise chip.** A category jump, a role swap and a flipped mystery dare carry an accent `Chip`
    with the surprise's name, above the category chip where the Together chip goes. A free pass has
    no chip, because the pass belongs to the player.
  - **Mystery dare.** `TurnView` shows `Card` in its face down state, named by
    `copy.roundPlay.faceDownLabel`, with no card text and no category, and under it only "Flip it",
    which sends `flip`. "Not this one" is not shown, and "End round" stays. The card turns over in
    280 ms (see below) and then shows as a normal card with the chip. Its penalty line reads
    `flippedPenalty` with the category's penalty plus one, which is what `summarise` charges, in the
    main text colour. Screen reader focus moves to the card text after the flip.
  - **The flip.** `useCardFlip` turns the card edge on over 120 ms, swaps the back for the card at
    90 degrees, and turns it back over 160 ms, with Reanimated and an animated style. The swap is
    driven by the animation's finish callback. With reduce motion on it fades out over 80 ms and in
    over 120 ms. The back stays up until the swap, so the card text is not in the tree before then.
  - **Free pass.** While the player holding the phone has a pass, their solo cards show an accent
    `Chip` marker, "Free pass ready", at the end of the turn line, and a full width secondary
    "Use free pass" button under Done and Pass. It sends `useFreePass`. It is not shown on a together
    card, on another player's card, or on a mystery card before its flip, which is when the engine
    would ignore it. The confirmation, "Pass used. Nobody drinks.", is a `NoticeBox` at the top of
    the first screen of the next card. It is a live region, announced on iOS when it appears, and it
    goes once the player moves on. If the round ends on that card the summary shows and it is
    dropped.
- A round of 10 or 20 cards shows a progress bar, announced as a progress bar named by the card
  count. An endless round shows only the count.
- The End round control, and going back by the system back button or the iOS swipe, open a confirm
  dialog. The screen calls `usePreventRemove` from `expo-router/react-navigation` while a card is in
  play. That is the hook the native stack reads, so the iOS swipe is stopped as well as the back
  button. A raw `beforeRemove` listener is not enough there.
  Confirming sends `end`. Once a card has been in play and the round is over, whether it ended by
  itself or by `end`, the screen replaces itself with the summary route. A round with no cards
  from the start is never shown the summary and says so instead.
- A quiet "Not this one" control sits under the buttons of every card in play, together cards
  included, and is not on the step up or pass the phone screens. It opens `NotThisOneSheet`, a
  modal sheet that a screen reader treats as a dialog. "Skip this card" sends `removeCard`: the
  engine draws a replacement of the same kind for the same player, the card number and history do
  not change, and nobody drinks or is counted as having done a dare. The sheet then closes. The
  sheet also has one switch per category the round was set up with, in the `CategoryToggle` of
  setup. Switching one off sends `disableCategory` at once, and the sheet stays open. If that was
  the category of the card in play, the engine replaces the card and the screen shows the new one
  once the sheet is closed. The last category on is locked and says "One category has to stay on."
  as setup does. A category already off shows as off and locked, because the round has no way to
  switch one back on. "Keep playing" and the system back button close the sheet. The same back
  hook closes the sheet when it is open and opens the end round dialog when it is not. If nothing
  is left to draw, the round ends and the screen goes to the summary as it always does. A skip or
  a switch-off pins the card view, so the replacement shows at once with no step up or pass the
  phone screen, even when it is in a higher category. Its cost is in the penalty line.
- The summary route shows the end of round summary. See the Summary screen section.

### Drink If home and setup

`games/questions` has a home, unlike Freak or Drink, because it has four places to go. The hub tile
opens it (`entryRoute` is `/games/questions`).

- `features/questionsHome` shows Theo's line as text in a bordered box, with his resting head beside it,
  and one `Card` button for each item in `homeEntries`. An entry
  with a `route` is on. An entry whose `route` is null shows as coming soon, disabled and named
  "title, Coming soon", so a ticket switches its entry on by giving it a route.
- `features/questionsSetup` is the Freak or Drink setup with two more groups: four format switches
  and six topic switches, each in one `Card` with `grouped={false}` of `Toggle` rows. The last format
  and the last topic left on are locked. The categories come from the level, as for dares. Only the
  names are remembered, through the settings provider, so they are shared with Freak or Drink.
- `availableQuestionCount` from `core` gives the number of questions the choices leave, so the
  screen holds no rules. When that is below a numeric length, a message says so. Start stays on and
  the round ends when the questions run out.
- Start builds the `QuestionRoundSetup`, starts the round with the shipped questions of every deck
  and the player's own (an empty list until the device stores them), saves the names and opens the
  play route.

### Drink If play screen

`features/questionsPlay/QuestionsPlayScreen` reads `questionTurnView(round)` from
`useQuestionRound()` and sends `answer`, `pick`, `next`, `removeQuestion`, `disableCategory` and
`end`. It holds no rules. The question number is `history.length + 1`, and the cost is the
category's `penalty`, or the drinks the reveal carries.

- Each question can come with a step up screen and a pass the phone screen before it, in that
  order, as for dares. The step up is `SteppingUpView` from `features/roundPlay`, given Theo as its
  character, his line, and "A drink now costs {n}" in place of the passing line, because a question
  has no pass. Pass the phone is `HandoffView`, shown when the holder differs from the previous
  question's holder, and before the first question. These are state of the screen, kept with the
  question number, and are not routes.
- Three views draw the question, all inside `TurnFrame`: the end round pill, the count and progress
  bar, the turn line with Theo's head at its end, the static question `Card` with its category and
  topic chips, and the Not this one link. The lead of a question ("Drink if") is part of the prompt
  in the accent deep colour, so it reads as one sentence.
  - `StatementView` is for `ifYou` and `neverHave`. Each player has a `SegmentedControl` named by
    the player, and neither is checked at first. The button sends `answer` once both are set, and
    either player can change an answer until then. Never have I ever words the options "I have" and
    "Never", and "I have" is the yes that drinks.
  - `PickView` is for `eitherOr` and `guess`. Each option is a `Card` button named by its text.
    Pressing one sends `pick`. The second pick of a would you rather question ignores presses for
    700 ms, so a fast second tap by the first player cannot answer for both. The options are not
    disabled and look the same.
  - `RevealView` is for every reveal: who drinks, what each player picked, or the answer and the
    guess. It reads the reveal and does no sums. The line that says the result is a live region.
- Would you rather keeps the phone, with no pass the phone screen between the picks. After the
  first pick the view draws the same options in the same order, with no selected state, a "Locked
  in" chip and a line that names only who has picked. Guess your partner has the holder answer
  under "Only {name} looks", then passes the phone to the guesser with `HandoffView` and its
  `line`, with no look away box, then has the guesser pick. The screen keeps which question has
  had its guess handoff, by question id, so a replacement question passes the phone again.
- A pick screen never shows an earlier private pick. The screen reads `questionTurnView`, which
  leaves the first pick out, and `PickView` is given only the stage and the options. It has no
  state of its own for a pick. Not this one drops the engine's first pick and the replacement has a
  new id, so nothing carries over. The statement view is keyed by the question id, so its answers
  start empty after a skip.
- Theo is the `shy` character. His mood follows the stage: resting while answering, sly when both
  have answered or on the second pick, happy for a good result, shocked for a bad one, and covering
  his eyes while the answerer picks. In a bold category (`c3` and `c4`) he is flustered at every
  stage except when covering his eyes, and on the step up. He is decoration, so a screen reader
  skips him.
- The End round pill, the system back button and the iOS swipe open the confirm dialog, through
  `usePreventRemove` as on the Freak or Drink screen. The same hook closes the Not this one sheet
  when it is open. Confirming sends `end`.
- Not this one opens `NotThisOneSheet` with the skip row worded for a question, which are its
  optional `skipTitle` and `skipHint` props. The sheet has the category switches as on Freak or
  Drink. A skip or a switch off pins the question view, so the replacement shows at once.
- When the round is over after a question was in play, the screen replaces itself with
  `/games/questions/summary`, the Drink If summary below.
  A round that starts with no questions says so, with a way back to setup.
- The screen stores nothing. The discoveries a round makes are in the round state, and the summary
  saves them.
- The copy is in `copy.questionsPlay`, and the leads are in `copy.questionLeads`.

### Drink If summary

`features/questionsSummary/QuestionsSummaryScreen` shows `summariseQuestionRound` of the round from
`useQuestionRound()`, laid out like the Freak or Drink summary. Nothing on it is logged.

- The heading is "Round over!", with a line giving the questions played and the categories reached.
  Each player has a `QuestionPlayerScore` block that reads as one group, such as "Alex, 3 drinks, 4
  of 5 guesses right, knows you best". The `knowsBest` player's block carries a "Knows you best"
  badge (an accent `Chip`). A tie has no badge, and a player who made no guesses has no guess line,
  so a round with no guess question has neither a guess line nor a badge. Theo's head sits beside his
  line in a bordered box: happy for a winner, shocked for a tie, resting when no guess was played. The
  line is a polite live region.
- When any would you rather question was played, a line says how many matched.
- **Saving discoveries.** The screen saves the round's discoveries once, through
  `useDiscoveries().addDiscoveries`, after the personal store has opened (a write to the placeholder
  store before that is lost) and only for a round that is over. The round object is remembered in a
  module level `WeakSet` when the write starts, so a render, an effect that runs again, or a screen
  that mounts again for the same round never saves twice, and a failed save is not retried.
  Whether saving is on is the hook's to decide. A round with no discoveries writes nothing.
- When saving is on and the round made discoveries, a card shows "{n} new discoveries". It is a link
  to the Discoveries screen once `discoveriesRoute` in the feature holds a route, and a plain count
  until then. When saving is off nothing about discoveries shows. A failed save replaces the card
  with a short message in a bordered box, and nothing else on the screen is blocked.
- Play again starts a round from `lastStart` (the setup and the questions) with a new seed from
  `randomSeed`, then replaces the summary with the play route. Settings goes back to setup, which is
  still mounted under the summary. Home goes to the Drink If home with `dismissTo`. The back gesture
  goes to setup.

### Entry guard

Until the player has confirmed on the `welcome` screen, no other screen exists. The screen asks the
player to confirm they are 18 or over, and its wording is in `content`.

- `components/EntryStack` is the root navigator. It renders nothing while the settings load, and
  after that it stays mounted. It uses Expo Router's protected groups: `welcome` is in a group that
  is open only until the player has confirmed, and every other route is in a group that is open
  only after. A deep link to a closed route, on a cold start or with the app already open, ends at
  `welcome`, and the closed screen never renders.
- A protected group only covers the routes listed in it, so every new route must be added to the
  second group in `EntryStack`. A route group with its own layout, such as `games/dares` or `games/questions`, is one
  screen in that group and its routes sit inside it. A test walks the real route files under
  `app/` and fails if any of them can be opened before confirming.
  The same test fails if `app/` holds a test file or any other file that is not a route or layout,
  because Expo Router bundles every file there, and a test file breaks the release bundle. Tests
  live beside the code, outside `app/`.
- `welcome` only stores the confirmation. The navigator reacts to the setting, sends the player to
  the first screen, and leaves nothing to go back to.
- Declining stores nothing. The closing screen is state inside the `welcome` route, not a route of
  its own, and it offers only a way back to the question.
- Nyx stands on both screens, with her arms crossed on the question and idle on the closing screen.
  The greeting is her speech bubble.
- `app/+not-found.tsx` is always available, so it reads the settings and sends an unknown path to
  `welcome` or to the first screen. Without it, Expo Router shows its own unmatched screen outside
  the root layout.
- Expo Router's built-in sitemap route also sits outside the root layout. It is turned off with the
  router plugin's `sitemap` option in `app.json`.
- The navigator must not be swapped for a redirect. Doing that remounts the root layout, re-reads
  the settings, and loops when a closed route is opened while the app is running.

### UI kit

`components/ui` holds the shared components, one folder each, imported from the barrel
`components/ui`.

| Component          | What it is, and its role and name                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Screen`           | The screen shell: safe area, themed background, padding, optional scrolling and optional keyboard avoidance (`avoidKeyboard`, which wraps the content in a `KeyboardAvoidingView` with padding). A layout container with no role. A screen's name is its `Header` heading. An optional `footer` is pinned under the content, outside a scroll view, above the keyboard.                                                                                                                                     |
| `Button`           | Role `button`, named by its label. Primary and secondary variants. A press gives feedback, see Press feedback below.                                                                                                                                                                                                                                                                                                                                                                                        |
| `Card`             | A static card is one accessible group named by its text, so it must not contain controls. With `grouped={false}` its children are read separately, which a card holding a heading needs. With `onPress` it is a `button` named by its `label`. `accent` edges it in the accent colour with the accent depth edge, and wins over `category`. `faceDown` (with `mark`, `title` and `label`) is the back of a card: static, an accent back with a dashed inner frame, one `img` named by `label`, no children. |
| `Toggle`           | Role `switch`, named by its label, with a checked and a disabled state. An optional `description` is drawn under the label in the muted body style and is the switch's accessibility hint. `locked` keeps it on, announces it as disabled and picks its track out with a foreground border instead of dimming the row. `lockedHint` is then its accessibility hint, in place of the description.                                                                                                            |
| `FavouriteToggle`  | A 48 by 48 `switch` named by its `label` prop, with a heart that is filled in the accent colour when on and drawn in the muted colour on a plain surface when off. The optional `context` is the card text and is the switch's accessibility hint. Props are `label`, `value`, `onValueChange` and `context`. It has no pressed or error look.                                                                                                                                                              |
| `SegmentedControl` | A group of radios with a visible label. Each option is a `radio` named by its label, with a checked state. The group carries the radio group role and the label as its name, but is not an accessibility element, because that would hide its radios. The visible label is left readable so a screen reader reads it once before the options.                                                                                                                                                               |
| `CategoryToggle`   | A `switch` named by its label, filled with its category colour when on and dashed when off. `locked` keeps it on, announces it as disabled and picks it out with a foreground border instead of dimming it. `lockedHint` is its accessibility hint, so a screen reader says why it does nothing.                                                                                                                                                                                                            |
| `Countdown`        | One `timer` element named by its `label`, whose value is the time left (`secondsText`), with the digits as m:ss and a bar that empties from the right. It runs on real time from `startedAt`. See Countdown below.                                                                                                                                                                                                                                                                                          |
| `Chip`             | A pressable chip is a `button` with a selected state. A static chip is plain text. `accent` fills it with the accent colour and sets its text in `on-accent-small`, and wins over `category`.                                                                                                                                                                                                                                                                                                               |
| `Dialog`           | A modal confirm dialog with the end round dialog's look: a scrim, and a panel with a heading title, a line, a primary confirm and a secondary cancel button. The panel has role `alertdialog`, is labelled by its title and is modal, but is not one accessibility element, so a test finds it by its label. Android back cancels. A tap on the scrim does nothing.                                                                                                                                         |
| `TextField`        | A labelled text input, found by its label. `multiline` makes it three lines high. `count` with `maxCount` draws "count/maxCount" under it, and `error` draws a message. An error or a count over the maximum takes the accent border, and focus the foreground border. The error and count under the box are hidden from a screen reader, and its hint is the error, then `countHint`.                                                                                                                      |
| `Header`           | The title has role `header`. The optional back control is a `button` named by the caller.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `Toast`            | A short line at the bottom of the screen, inside the safe area and 16 from the edges. One `button` named by its message, with the dismiss hint, a polite live region, and announced on iOS. It fades in, stays about 3 seconds, fades out, or is tapped away. With reduce motion on it just appears and disappears. Only the toast takes touches.                                                                                                                                                           |
| `Character`        | One of the cast, drawn in code and animated. Decorative, so it is hidden from screen readers and has no role or name. See Characters below.                                                                                                                                                                                                                                                                                                                                                                 |
| `SpeechBubble`     | A bubble with a tail, holding the text the caller passes in. The text is read like any other text and the tail is decoration. `popIn` animates it in, and reduced motion shows it at once.                                                                                                                                                                                                                                                                                                                  |

- **Countdown.** Props are `seconds`, `startedAt` (a wall clock time in milliseconds, or null before
  it starts), `label`, `secondsText`, `endText` and `onEnd`. It holds no copy and no haptic. The
  digits are `Math.ceil` of the time left, refreshed with a timeout set for the next whole second.
  While the app is not in the foreground the timeout is dropped, and coming back works the time left
  out again from the clock, so a locked screen does not pause it and nothing runs unseen. `onEnd`
  and the announcement at zero happen once, when the time left reaches zero, which may be when the
  app comes back. The unmount cleanup clears the timeout, removes the app state listener and cancels
  the bar's animation. Starting it again (a new `startedAt`) is a new run. Before it starts it shows
  the full time and an unmoved bar, and at zero its border turns to the accent colour. A screen
  reader finds one timer element, and its value changes silently. It is announced only when 30 and
  10 seconds are left, if the countdown is longer than that, and at zero with `endText`. The bar is
  a fill, as wide as the track, that Reanimated slides left with a linear timing over the real time
  left, and starts again from the real time left when the app comes back. With reduce motion on there
  is no timing and the bar steps once a second. The vibration card reuses it.
- Player-facing text is passed in as props by the caller, from `content`. Components hold no copy.
- Buttons and cards have a solid depth edge, built from a layered view in a token colour, not a
  shadow. Pressing a button or a pressable card sinks its face onto the edge.
- `app/dev/kit.tsx` is a gallery of every component and state, for looking at the kit on a device.
  Expo Router bundles every file under `app/`, so the route file exists in every build. The gallery
  code is required only when `__DEV__` is true, a production build that reaches the route is sent
  back to the first screen, and the link to it renders only in development.
- Component tests render through `tailwind/renderThemed`, which compiles the real Tailwind config.
  Its safelist must list every utility prefix and variant a component uses. One that is missing
  silently does not resolve.
- Decorative parts with no role, such as a depth edge or a toggle's knob, are reached in tests
  through `tailwind/hostViewsInside`, starting from the element that was found by role.

## Brand assets

- The app icon, the Android adaptive icon layers (foreground and monochrome), the splash image and
  the 512 px Play store icon are made by `apps/mobile/scripts/generateBrandAssets.mjs`. The SVG
  artwork is written in that script, with every colour read from `@getfreak/tokens`, and
  `rsvg-convert` (`brew install librsvg`) renders it to PNG. It is a dev-time tool and CI does not
  run it.
- The app files go to `apps/mobile/assets/images` and are committed. The Play store icon goes to
  `apps/mobile/store/play-icon-512.png`. It is uploaded by hand and is not bundled or referenced by
  `app.json`.
- The splash image is the mark alone on a transparent background, so one file serves both themes.
  The splash background colours are in `app.json` (see Styling).

## Press feedback

`apps/mobile/feedback` gives a press a sound and a haptic in one call. It sits beside `settings` and
`storage`, not under `features`, because the UI kit `Button` uses it.

- There are five moments: `tap`, `done`, `pass`, `roundComplete` and `timerEnd`. `useFeedback()`
  returns one call for each. A call plays the moment's sound first and then fires its haptic, in the
  same call, so they land together. `roundComplete` and `timerEnd` have a haptic and no sound.
- `Button` takes `feedback`, which is `tap` unless it says `done`, `pass` or `none`. A press asks for
  its feedback and then runs `onPress`. Nothing waits on the feedback, so the action is never
  delayed. A disabled button gives none. The turn's Done and Pass use `done` and `pass`, and so do the
  together card's "We did it" and "We drink".
- `createFeedback(device, { soundOn, hapticsOn })` holds the rules: skip the sound when sound is off,
  skip the haptic when vibration is off, and swallow any error without logging it. It is pure, and
  its tests use a fake device.
- A `FeedbackDevice` is the phone: `playSound` and `triggerHaptic`, both fire and forget.
  `nativeFeedbackDevice` is the real one and the only code that imports `expo-audio` and
  `expo-haptics`. Tests replace the device, or the provider, and never reach the native modules.
- `FeedbackProvider` sits inside `SettingsProvider` at the root. It creates the native device once,
  when it first renders, which sets the audio session and loads all three sounds, so the first press
  has nothing left to load. It rebuilds the calls when a setting changes. With no provider above, the
  calls do nothing, so a component can be rendered alone.
- Audio session: `playsInSilentMode: false`, so the iOS silent switch mutes the sounds, and
  `interruptionMode: 'mixWithOthers'`, so music already playing is neither stopped nor lowered. On
  Android that mode asks for no audio focus. The sounds follow the media volume on both platforms.
  The `expo-audio` config plugin is set to add no microphone permission, no record permission and no
  background playback service. On Android, `playsInSilentMode: false` also mutes the sounds when the
  ringer is on silent or vibrate.
- Haptics follow the phone's own setting. On iOS the impact and notification generators are silent
  when System Haptics is off. On Android the effects are the view haptic effects from
  `performAndroidHapticsAsync`, which follow the touch feedback setting and need no permission. The
  vibrator calls are not used, because they ignore that setting. A phone with no haptic hardware
  does nothing and no error shows. Each haptic call is wrapped, so a rejection or a throw is dropped.
  The later pulses of the round complete run are timers, and `cancelHaptics` drops them. The summary
  calls it when it is left, and the provider calls it when vibration is turned off.
- Each moment has its own feel. On iOS a tap is a light impact, done is a success notification and
  pass is a warning notification. On Android they are the virtual key, confirm and reject effects.
  The round complete haptic is a run of four pulses over about half a second on both platforms, so it
  cannot be taken for a press. The timer end haptic is one heavy impact on iOS and one long press
  effect on Android, which no press uses. The timer card plays it when its countdown ends.
- The sounds are in `assets/sounds` and are original. `scripts/generateSounds.mjs` makes them, and
  the folder README says so and lists the alternatives. A test reads the shipped files and checks
  they are short, mono, 16-bit and quiet.
- Native modules are not available under Jest. `jest.setup.js` replaces `expo-audio` and
  `expo-haptics` with stand-ins that do nothing for every test, and a test that checks what was
  asked of them mocks them itself. Route tests replace the native device with one recording device,
  `feedbackDevice` in `features/welcome/testing/appEnvironment`.

## Characters

The cast is five characters, addressed in code by role and never by display name, because names have
changed twice. `core` exports `characterIds` and the `CharacterId` type: `host`, `dealer`, `hype`,
`gatekeeper` and `shy`. `content` holds each character's display name and a one line personality in
`characterNames`, typed by the id.

The art is code-drawn vector art, not Rive files. It lives in `apps/mobile/characters/` as pure
data, with no React, and a README that says how to draw one. A character is an ordered list of
shapes in a 240 by 240 canvas, split into the parts that move on their own:

- `hairBack`, `body`, `head`, `hairFront`, and for each mood the face (eye whites, irises, lids,
  a blink shape, brows, mouth, extras) and the two limbs, each with a pivot.
- A shape is `{ d, fill, stroke, strokeWidth, opacity }`. `d` is a path written out as numbers.
  `fill` and `stroke` are palette slot names. No colour appears in the art.
- A mood is a `CharacterMood`. Every character has `idle`, `happy`, `flirty` and `shocked`. The
  pose moods belong to one character each: `wave` to `host`, `celebrate` to `hype`, `armsCrossed`
  to `gatekeeper`, and `flustered` and `coverEyes` to `shy`. `MoodsByCharacter` types them, and the
  `Character` props are generic in the role, so a mood the character cannot show fails typecheck.
- `composeLayers` lists a mood's layers from back to front. The component and the preview script
  both use it.

Colours come from `packages/tokens/src/characters.ts`: a light and a dark palette for each
character, with the same named slots (skin, hair, iris, outfit and so on, plus a `rim` that lifts
the figure off the grape background in the dark theme). A parity test checks the keys. `tokens`
imports nothing, so its palette keys are written out, and the app indexes them by `CharacterId`, so
a character without a palette fails typecheck.

`Character` takes the role, the mood, a `size` (`tile` 64 dp, `medium` 96 dp, `hero` 150 dp), a
`crop` (`bust` or `head`) and an optional `animated` (true by default). Its props are a union over
the roles, so the role and the mood are checked as a pair even when the role is only a
`CharacterId`. An unknown mood at run time draws the idle one. `CharacterOf` is the same component
generic in the role, for code such as the kit gallery that holds the pair as type parameters. It
picks the palette from NativeWind's `useColorScheme`, which is what the Tailwind variables follow,
so the art always matches the theme.

Motion runs on the UI thread. Each moving part is its own `react-native-svg` layer inside an
animated `View`, and the animated view takes the transform. react-native-svg turns a `transform`
into a matrix in JavaScript when it renders, so a Reanimated `transform` on an SVG group would not
reach the native side from the UI thread, and animating the matrix prop directly could not be
checked without a native build. A transform on a `View` is known to work. Each layer is an `Svg` of
the full size, so the pivot of a part is an offset from the view centre.

- Idle: breathing (about 3.6 seconds a cycle), a blink of about 120 ms every few seconds with a
  double blink now and then, the irises glancing, and a small sway of the hair.
- A mood change plays a reaction of about 400 ms and settles into the mood's idle: a squash and hop
  for `happy`, `celebrate` and `wave`, a jolt for `shocked`, `flustered` and `coverEyes`, and a head
  tilt for `flirty` and `armsCrossed`.
- Poses move their limbs: the wave, the double fist pump, the finger tap and the peek.
- With reduced motion on (Reanimated's `useReducedMotion`), or `animated={false}`, no loop starts
  and no reaction plays. The component shows the mood's still pose as one SVG of all the layers,
  with no animated views, so the resting head tilt of a mood is not applied.
- The art is decorative. It is hidden with `accessibilityElementsHidden`,
  `importantForAccessibility="no-hide-descendants"` and `aria-hidden`, and has no role or label.

The preview script `apps/mobile/characters/scripts/renderCastPreview.mjs` draws every character,
mood, theme and size from the same data into one HTML file. The kit gallery has a Cast section for
looking at the motion on a device.

## Press effects

Pressing Done or Pass on the turn screen plays a short effect from the button. They live in
`features/roundPlay/pressEffect`. They are decoration only.

- **Done** is a starburst of 590 ms: a core star and twelve stars, diamonds and dots fanning up from
  the top edge of the button, in the colour of the card's category (together cards too). **Pass** is
  a splash of 700 ms: a muted ring and six drops that jump and fall back under gravity. They differ
  in shape, direction and colour, so they can be told apart with the sound off.
- Every shape is a plain view in token classes, because the effect needs no svg. A star is two
  stretched squares, a diamond is a turned square and a dot is a pill.
- `motion.ts` holds every duration, easing, angle and distance in typed constants, with the per
  particle tables from the design. `effectDuration` is derived from them.
- The effect is hosted in `RoundPlayScreen`, not in the button, because answering replaces the
  buttons at once. `TurnView` measures the pressed button with `measureInWindow` before it calls
  the answer, and the answer never waits for the measurement. The screen then measures its own
  root view, shifts the bounds to that view's corner, and draws `PressEffectLayer` over the
  current view. The effect starts at the centre of the button's top edge.
- There is one effect at a time. A new press gives the effect a new key, which remounts the layer
  and drops the particles of the one still playing. The layer takes itself off after the effect's
  duration with a timer, and clears the timer if it unmounts first, so leaving the screen
  mid effect leaves nothing behind.
- The layer has `pointerEvents="none"`, `accessibilityElementsHidden` and
  `importantForAccessibility="no-hide-descendants"`. The buttons keep their role and name.
- With the system reduce motion setting on (`useReducedMotion()`), no particle is mounted. An 8 dp
  ring around the button fades in and out instead, in the category colour for Done and muted for
  Pass. Its timings carry `reduceMotion: ReduceMotion.Never`, or Reanimated would skip them.
- The effect of the last card is not shown. The screen is replaced by the summary as soon as the
  round ends, which unmounts the layer.
- The effects are not tied to the Settings switches. Sound and vibration have their own, and the
  system reduce motion setting is the only control of the animation.
- Under Jest, `jest.setup.js` mocks `react-native-worklets` and `react-native-reanimated` with their
  own mocks, so an animation jumps to its end and never runs. Tests check what is mounted, not the
  frames. `useReducedMotion` is a Jest mock there, set per test.

## Settings screen

`features/settings/SettingsScreen` is the `/settings` route. It shows the `Header` with a back button
and the title, then one static `Card` (not grouped, so each switch is read on its own) holding two
`Toggle` rows, Sounds and Vibration, with a divider between them. Each caption is the toggle's
`description`, so it is also the switch's hint. A change is
stored at once through the settings context. The hub has a secondary Settings button below the game
tiles, pushed to the bottom by a flexible spacer. The dev kit link stays below it, in development builds only. The route is in the second protected group of `EntryStack`, so it is closed until the player
has confirmed. Back goes to the hub, and a deep link with nothing behind it replaces the screen with
the hub. All its text is in `content`.

## Updates

JavaScript and content changes reach installed phones over the air, through EAS Update.

- `expo-updates` is configured in `apps/mobile/app.json`. `updates.url` points at the EAS project,
  `checkAutomatically` is `ON_LOAD` and `fallbackToCacheTimeout` is 0. At launch the app checks for
  an update and downloads it in the background without waiting for it, and the update runs from the
  next cold start. Nothing calls `reloadAsync`, so the app never restarts in the middle of a round.
- `runtimeVersion` uses the `fingerprint` policy, a hash of the project's native parts. A new native
  module, plugin, permission or native config moves the hash by itself, and a JavaScript-only change
  does not. An update only reaches builds with the same runtime version, so one built from a
  different lockfile or config just does not reach the phone. Any native change needs a new build.
- Each EAS build profile has a channel: `preview` and `development` for now, and `production` gets
  its own when the store profile exists. An update is published to a channel from `apps/mobile`
  with `eas update`, see the README. CI never publishes.
- A failed check or download is silent. The app keeps the version it has, and nothing is logged.
- `apps/mobile/updates` holds the toast logic. `announceUpdateOnce` takes an `UpdatesDevice`, which
  is the only thing that touches `expo-updates` (`nativeUpdatesDevice`), and the storage. It returns
  true once for each update id that differs from the stored `lastShownUpdateId`, and records it. An
  embedded launch (a fresh install or the installed build), no update id, or a device that cannot be
  read gives false. `UpdateToastHost` sits in the root layout and shows the kit `Toast` with the
  line from `content` when that is true. Under Jest `expo-updates` is replaced by an embedded
  launch, so no test announces an update by accident.

## Storage

One module, `apps/mobile/storage`, is the only code that touches persistence.

```ts
interface Storage {
  get<T>(key: StorageKey, schema: ZodType<T>): Promise<T | undefined>;
  set<T>(key: StorageKey, value: T): Promise<void>;
  remove(key: StorageKey): Promise<void>;
  clearAll(): Promise<void>;
}
```

- Settings are backed by the key-value store that ships with `expo-sqlite`. It holds nothing a
  player writes, and it is not encrypted.
- Keys are a closed union type. Every read is validated with a schema, and a value that fails
  validation is treated as absent.
- `createStorage(backend, clearPersonalStore)` takes the way to clear the personal store. `clearAll`
  clears both the key-value entries and the personal store. It tries both even when the first
  fails, then reports the first failure, so a retry finishes the job. Tests cover it.
  Secure items are cleared by `secureStorage.clearAll`, and `clearEverything` runs both. Any later
  store (files, secure items) must be added to one of them in the same change.
- Settings are the keys in `StorageKey`. `questionPreferences` (FRK-38) holds only the
  keep-discoveries switch. Nothing else from a round is kept, except the id of a card a player
  chooses to favourite on the summary, which goes to the personal store.

### Secure storage

The same module owns secure storage, which is the Keychain on iOS and Keystore-backed storage on
Android, through `expo-secure-store`. Nothing else imports it.

```ts
interface SecureStorage {
  get<T>(key: SecureKey, schema: ZodType<T>): Promise<T | undefined>;
  set<T>(key: SecureKey, value: T): Promise<void>;
  remove(key: SecureKey): Promise<void>;
  clearAll(): Promise<void>;
}
```

- **Closed list.** `secureKeys` is a list, and `SecureKey` is the type made from it, so `clearAll`
  reaches every item by construction. The items are `personalDatabaseKey`, `lockPinHash`,
  `lockAttempts` and `lockBiometricsChoice`. The name is the name of the item on the phone, so it
  is never renamed.
- **Values.** Every value is written as JSON and checked with a schema on read. A value that is
  missing or fails its schema counts as absent. The schemas for the lock items are in `core`
  (`lock.ts`). FRK-41 wrote the database key as bare text, and an upgraded phone keeps it, so a
  value that fails as JSON is tried once as plain text against the same schema. Only a text item
  can match, which is how the old key is still read.
- **Accessibility.** Every item is written with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, in one place
  (`defaultSecureStorage`), so none can be written without it.
- **`clearAll`.** It removes every item in the list, tries all of them even when one fails, then
  reports the first failure. Removing an item that is not there is fine, so it is safe to run twice.
- **Tests** run over an in-memory backend, the same `createInMemoryBackend` the key-value tests
  use, because the secure backend needs only `getItem`, `setItem` and `removeItem`.
- Nothing logs. A parse or validation error can echo a PIN hash or the key, so none is passed up.

### Install marker

iOS keeps Keychain items after the app is deleted, so a reinstall could find an old PIN or database
key. `ensureInstallMarker` runs before anything reads settings, the database key or the lock. In
the root layout, `InstallMarkerGate` runs it and renders its children only once it is done.

- The marker is the key `installMarker` (the value `true`) in the key-value store, which goes when
  the app is deleted.
- If the marker is missing, secure storage is cleared first and the marker is written after, so a
  launch cut short in between runs the check again. The exception is an upgrade: a phone that ran
  a build with no marker holds `entryConfirmation` in the key-value store, which a reinstall does
  not. The marker is then written and nothing is cleared, so the database key survives.
- A marker that cannot be read clears nothing, because a failed read does not say it is a fresh
  install. A clear or a write that fails leaves the marker unwritten. In both cases the check runs
  again at the next launch, and the app is never blocked. If a native call never answers, the
  gate shows its children after 3 seconds anyway. The check then skips the clear and the marker
  write, so a late answer cannot wipe secure items the running app has read.
- It never throws and never logs.

### Clear everything

`createClearEverything` takes its steps as parameters and gives one function that returns
`{ ok: true }` or `{ ok: false }`. It never throws, and the result holds no error, because an
error message can hold stored text. The screens get it from `useClearEverything()`, which needs a
`RootRemount` above it.

1. Cancel every scheduled notification (`expo-notifications`).
2. Clear secure storage (`secureStorage.clearAll`), which removes the PIN hash, the biometrics
   choice, the wrong PIN count and the database key.
3. `storage.clearAll()`, which closes and deletes the encrypted database and clears the key-value
   store.
4. Write the install marker back. Step 3 removed it, and without it the next launch would take
   the app for a fresh install and clear a PIN set since.
5. Remount the root.

- Every step is safe to run twice. A step that fails does not stop the others, so as little as
  possible is left behind. The marker is not written and the root is not remounted when any step
  failed, and the result says so. A retry runs all the steps again and finishes.
- `RootRemount` (in `app/_layout.tsx`, around the providers that read stored data) holds its
  children under a changing `key`, so remounting mounts every provider again from empty storage.
  A provider that a later milestone adds there needs no reset method. `InstallMarkerGate` sits
  outside it, so a remount does not run the check again.
- Afterwards the app is as on first launch: the entry guard sees no confirmation and shows the 18+
  screen. It keeps the app, permissions given in the phone's settings and store purchases.
- A test fills a phone with names, settings, 250 player cards and 150 discoveries and checks every
  store is empty afterwards, then fails each step in turn and retries. Another renders the real
  root layout with entry confirmed, runs `useClearEverything()` from a stand-in screen and expects
  the 18+ confirmation screen.

### Personal store

What a couple writes lives in `personal.db`, an encrypted database with tables. It is behind one
module, `storage/personal`, and nothing else touches it.

- **Encryption.** `expo-sqlite` is built with SQLCipher through its config plugin
  (`["expo-sqlite", { "useSQLCipher": true }]` in `app.json`). The database is opened with a random
  256-bit key, written as 64 hex characters and given to SQLCipher in its raw form
  (`PRAGMA key = "x'...'"`), so it runs no password derivation.
- **The key.** It is made on first launch from `expo-crypto`'s random bytes and kept in secure
  storage (see Secure storage) under the item `personalDatabaseKey`, so it is readable only while
  the phone is unlocked and never leaves this device. A stored value that is not 64 hex characters
  counts as absent. It is read only to open the database. It is never logged.
- **Schema.** Step 1 of the migrations makes four tables. `player_card` has `id`, `category` and
  `kind` (checked against the core ids), `text` (checked 1 to 140 characters), `created_at` and
  `updated_at`. `favourite` has `card_id` and `created_at`. `deck` has `id`, `name` (checked 1 to
  30 characters), `created_at` and `updated_at`. `deck_card` has `deck_id` (deleted with its deck),
  `card_id` and `position`, with its primary key on `deck_id` and `card_id`. Times are milliseconds
  since 1970. A favourite or deck card id is a shipped id or a player card id, so it has no foreign
  key.
- **Question tables (step 2).** `player_question` has `id` (`pq-` plus a UUID), `format` (checked
  against the four round formats, so not `secretMatch`), `category` and `topic` (checked against the
  core ids), `text`, `options` (JSON, null for `ifYou` and `neverHave`), `created_at` and
  `updated_at`. Text is checked 1 to 140 characters and may be null for `eitherOr` only, and
  `options` is null exactly for the two statement formats. `discovery` has `kind`, `question_id`,
  `player`, `option_id`, `strength` and `created_at`, with the primary key on `kind`, `question_id`
  and `player`. `player` is empty for `match` and `agree` and holds the answerer's name for `answer`,
  because that entry is about one partner and the names can change later. A check ties each kind to
  the columns it uses. A discovery holds ids, never question text, so a fix to a shipped question
  shows in old discoveries. `question_id` has no foreign key, because it may be a shipped id.
- **Questions in the repository.** `listPlayerQuestions`, `savePlayerQuestion` and
  `deletePlayerQuestion` follow the card methods. Saving tidies and checks the text and each option
  with the card text rules (repeats are checked against the shipped questions that have text and
  the other player questions, and options against each other), checks the option count for the
  format (2 to 4 for `guess`, exactly 2 for `eitherOr`, none for the statement formats, reported as
  `optionCount`) and enforces the 300 question limit, `limits.playerQuestions`. Option ids are
  `o1`, `o2` and so on by position. Deleting a question deletes its discoveries in the same
  transaction.
- **Discoveries in the repository.** `listDiscoveries`, `addDiscoveries`, `removeDiscovery` and
  `clearDiscoveries`. Adding stamps each draft with the time of the call, and a draft with the key
  of a stored discovery replaces it and moves to the end of the list. A draft that fails the core
  schema is skipped. A batch is one transaction. Reading skips a row that fails the schema, and a
  discovery whose question is neither shipped nor a player question, or that names an option the
  question does not offer, is skipped and kept, so it comes back with the question. The answerer's
  name is trimmed, and an answer with a blank name is skipped. Only what both partners saw is stored, which the engines decide
  when they return `NewDiscovery`. The repository stores what it is given.
- **The keep-discoveries switch.** `questionPreferences` is a key in the key-value store holding
  `{ saveDiscoveries }`. Its default is `defaultSaveDiscoveries` in core, which is `true` until the
  owner answers FRK-33. `useDiscoveries` (in `apps/mobile/personal`) gives the list, `addDiscoveries`
  (which does nothing when the switch is off, and reads the switch from storage on each call),
  `removeDiscovery`, `clearDiscoveries`, and `saveDiscoveries` with `setSaveDiscoveries`. Turning
  the switch off deletes nothing, and the screen offers to clear. `useCustomQuestions` gives the
  list, `save` and `remove`. Both read the repository from `usePersonalData`, so they follow a
  `reload`. `clearAll` covers all of it: the tables are in `personal.db`, and the key goes with the
  key-value store.
- **Migrations.** `migrations.ts` holds an ordered list of SQL steps. Step N takes the database from
  version N to N + 1. Each runs in one transaction and sets `PRAGMA user_version`, so a failed step
  leaves the earlier version. They only go forward, and a shipped step is never edited. A database
  with a version above the last step (made by a newer app) is refused and left alone. Step 2 (FRK-38)
  adds the question and discovery tables. A test runs every step against `node:sqlite`, from empty
  and from each earlier version.
- **Repository.** `PersonalRepository` lists, saves and deletes player cards, lists and sets
  favourites, and lists, saves and deletes decks. Saving a card tidies and checks its text with the
  core rules (repeats are checked against the shipped cards and the other player cards) and
  enforces the 300 card limit. Saving a deck trims the name, drops repeated card ids and enforces
  the 20 deck and 200 card limits. Every limit comes from core `limits`. A failed save returns
  problem codes or `limit`, and writes nothing. Deleting a card removes it from favourites and
  decks in one transaction.
- **Reading.** Every row is checked with the core schemas, and a row that fails is skipped, not
  thrown. A favourite or deck card whose id is neither a shipped card nor a player card is skipped
  when read and kept in storage, so a card that returns in a later deck version comes back. Saving
  a deck keeps such an entry, after the cards the screen listed.
- **Two implementations.** `createPersonalRepository` runs over a `SqlDatabase`, and
  `createInMemoryPersonalRepository` keeps everything in memory for screen tests. One shared set of
  tests runs against both, and the database one runs on `node:sqlite`. `node:sqlite` is not
  encrypted, so these tests prove the schema, the migrations and the repository, not the key.
- **Provider.** `PersonalDataProvider` and `usePersonalData` (in `apps/mobile/personal`) open the
  database once at launch, in the same shape as the settings provider. They give `isLoading`,
  `loadFailed`, `repository`, `recoveredFromUnreadable` and `dismissRecoveryNotice`. A failed load
  never blocks the app. Screens see an empty in-memory store and `loadFailed`.
- **A lost key.** If the key is missing or does not open the file, which can happen when a phone
  restores the database from a backup without its key, the file is deleted and made again empty,
  and the repository reports `recoveredFromUnreadable` once so the My dares screen can say so. The
  file is deleted only when SQLite says "file is not a database". A full disk, a lock or a newer
  schema fails the load and leaves the file and the key alone.
- **Transactions.** A transaction is run with `BEGIN IMMEDIATE` and `COMMIT` on the one keyed
  connection, behind a queue. `expo-sqlite`'s `withExclusiveTransactionAsync` opens a second
  connection that does not have the key, so it cannot be used on an encrypted database.
- **`clearAll`.** It closes the database, deletes `personal.db` and its `-journal` and `-wal` files, and deletes the key. Each step is
  safe to run twice. A later load makes a new key and an empty database.
- **After `clearAll`.** The repository the provider holds points at a closed database. Clear
  everything remounts the root (see Clear everything), so the provider opens a new database with a
  new key. A caller that runs `storage.clearAll()` by itself must call
  `usePersonalData().reload()` after it. `reload` sets `isLoading` and opens a new database.
- **While loading.** Screens must not write while `isLoading` is true, because a write to the
  placeholder store is dropped when the real repository arrives. The same holds after `loadFailed`,
  where writes last for the session only.
- **Android backup.** `android.allowBackup` is `false` (FRK-58). The `expo-secure-store` plugin also
  sets `fullBackupContent` and `dataExtractionRules` that include only shared preferences and
  exclude SecureStore, so the key is not backed up and, with it, the database is unreadable from a
  backup.
- **Native build.** SQLCipher, `expo-secure-store` and `expo-crypto` are native, so this needs a
  new build.

## App lock

The rules are pure and live in `packages/core/src/lock.ts`. The service that keeps the PIN is
`apps/mobile/lock`. The screens that use them (FRK-63, FRK-65, FRK-66) are separate tickets.

- **Off by default.** Nothing asks at first launch. A player turns it on in Settings. It needs a
  4 digit PIN, and biometrics are an optional extra on top of it, offered only when the phone has
  them set up.
- **The PIN.** `isValidPin` accepts exactly 4 ASCII digits. It is kept as
  `SHA-256(salt + ":" + PIN)` with a random 16 byte salt, in the secure item `lockPinHash`. Whether
  the lock is on is read from the presence of that hash, so there is no flag that could disagree.
  Four digits are only 10,000 values, so the hash alone does not stop someone who can read the
  secure item. What holds is that the item is readable only on this unlocked phone, and the wait.
- **When it locks.** `shouldLock(wentToBackgroundAt, now)` is true on a cold start (no time given),
  after 60 seconds or more away, and when the clock went backwards. `countsAsBackground` is true
  only for the `background` app state, so the iOS `inactive` state (the notification shade,
  Control Center, a call banner) never starts the time away. The 60 seconds is a constant, not a
  setting, and it applies mid-round too.
- **Wrong PINs.** `waitAfterFailureMilliseconds` gives no wait until the fifth wrong PIN in a row,
  then 30 seconds. Each further run of five doubles it, up to 15 minutes. The count and the end of
  the wait are the secure item `lockAttempts`, so a restart does not reset them. A try made during a
  wait is not looked at and not counted. The right PIN, or a pass at the biometrics prompt, starts
  the count again. Wrong PINs never erase anything. `remainingWaitMilliseconds` is capped at the
  longest wait, so a clock set far back cannot lock a player out for good.
- **No recovery.** A forgotten PIN is fixed by Clear everything, which needs no PIN. Biometrics
  still unlock if they were turned on.
- **The service.** `createLockService` takes the secure storage, a biometrics device, a SHA-256
  function, random bytes and a clock, so tests pass fakes. `lockService` is the one the app uses.
  It can set a PIN (which also starts the wrong PIN count again), check a PIN, clear the PIN (which
  removes the hash, the count and the biometrics choice), say whether the lock is on, give the
  time left of a wait, say whether biometrics are available and which kind, ask for biometrics, and
  read and set the biometrics choice. Checks run one at a time, so a burst of tries cannot get
  past the count.
- **What it leaves to the screens.** Changing the PIN or turning the lock off needs the current
  PIN or biometrics. The service does not ask, so the screen must. A call that cannot reach secure
  storage rejects, and the lock screen treats that as locked.
- **Biometrics.** Available means the phone has the hardware and the player has set up a face or
  finger. The kind is face, then fingerprint, then iris. The prompt does not offer the phone
  passcode, because biometrics are never a way round the PIN. The prompt text comes from the
  caller.
- **Face ID text.** The usage text is in `app.json` through the `expo-local-authentication` plugin,
  because the native build reads it before any JavaScript runs. That is an exception to "copy lives
  in content". Change it there.
- **Nothing logs** a PIN, a hash, a salt, a key or a stored value, and no error message holds one.
  Tests spy on the console.
- **Native modules.** `expo-local-authentication`, `expo-notifications` and `expo-screen-capture`
  are added now so the milestone needs one new build. `expo-screen-capture` is first used by the
  lock screen, and `expo-notifications` by the reminder. This needs a new build. The Android
  permissions the modules add are listed under Checks and CI.

## Styling

- Tokens are defined once in `packages/tokens`, as typed data: two colour themes with the same
  keys, a type scale, a spacing scale and a radius scale. `apps/mobile/tailwind.config.ts` feeds
  them to the Tailwind config that NativeWind reads.
- Screens and components use utility classes only. No raw colour values outside `tokens`, and no
  inline `style` objects. The one exception is a Reanimated animated view, which takes its style
  through the `style` prop because Reanimated writes it from the UI thread. It also takes
  `StyleSheet.absoluteFill` for its layout. An ESLint rule fails on a hex colour or a colour function, such as
  `rgb()`, `hsl()` or `oklch()`, in JavaScript and TypeScript source outside `packages/tokens`, and
  a test does the same for the app's CSS files. Named colours such as `red` are not checked, so
  review has to keep those out. The one allowed `style` prop is an animated style on a Reanimated
  `Animated.View`, see Press effects.
- The one exception is `apps/mobile/app.json`. The splash screen background (light and dark) and
  the Android adaptive icon background are read by native code before any JavaScript runs, so they
  must be written there as hex values. `apps/mobile/appConfig.test.ts` keeps them equal to the
  tokens they stand for and fails on any colour in `app.json` that is not a token. Nothing else in
  that file may hold a colour.
- The window and navigation backgrounds are themed from the tokens at run time: `ThemedNavigation`,
  at the root, reads the current theme's background token and gives it to the navigation theme
  (`background` and `card`), so every stack, nested ones included, inherits it, and to
  `expo-system-ui` for the native window. A gap between screens never shows the wrong theme.
- There are two themes, light and dark, and the app follows the device's colour scheme. The Tailwind
  config writes each theme as CSS variables, the light values by default and the dark values under
  `prefers-color-scheme: dark`. A colour class is semantic and reads a variable, so a screen writes
  one class, such as `bg-background` or `text-foreground`, and needs no `dark:` variant.
- Each category id has a fill colour, `category-c1` to `category-c4`, and a label colour for text on
  that fill, `on-category-c1` to `on-category-c4`. In the dark theme a category colour is readable
  on the background by itself. On the dark surface colour its contrast drops as low as 4.33, so
  there, and everywhere in the light theme, it is a fill or a large label that carries its own
  label colour, never small bare text.
- Text on the accent colour (`on-accent`) is for large bold labels only, such as a button. In the
  light theme its contrast is 3.37, which is not enough for small text. Small text on the accent,
  such as a chip label, uses `on-accent-small`: 4.63 in the light theme and 11.06 in the dark.
- Only the token colours exist as colour utilities, plus the keywords `transparent` and `current`.
  Tailwind's default palette is not available, and opacity modifiers such as `bg-accent/50` do not
  work, because the variables hold hex values. Use an `opacity-*` utility for a disabled state.
  Tailwind's default shadow and ring utilities still carry colours of their own, so they stay
  unused until they are given token values.
- Spacing and radius utilities are in pixels and named by their value or size: `p-16` is 16px, and
  the radii are `rounded-none`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` and
  `rounded-pill`. This differs from stock Tailwind, where `p-4` is 16px. A spacing value that is not
  on the scale, such as `p-5`, produces no style and no error.
- Type is set with one class per style: `type-display`, `type-title`, `type-heading`, `type-body`,
  `type-body-bold`, `type-label` and `type-caption`. Each sets the font family, size and line
  height. Display, title and heading use Baloo 2. The rest use Nunito. Stock Tailwind type utilities
  such as `text-sm` and `font-bold` are switched off, so these classes are the only way to set type.
  The label and caption styles also carry a little letter spacing.
- The font files ship in the app bundle, one file per weight, and are loaded in the root layout
  before any route renders. If a font fails to load the app still renders, in the system font.
- The splash screen stays up while the fonts and the settings load. The root layout holds it with
  `SplashScreen.preventAutoHideAsync()`, and `SplashReveal`, inside `EntryStack`, hides it the first
  time the stack has been laid out. A font error still lets the app render, so it still hides.
  `SplashSafetyNet` hides it after 5 seconds regardless, so a font load or a storage read that
  hangs never leaves it up. A refused hide is tried once more.
- Tests in `tokens` check that both themes have the same keys and that the listed pairings meet
  their contrast thresholds: text and muted text on the background and the surface, text on the
  accent, text on each category fill, and each dark category colour on the dark background and
  surface. The accent colours themselves are not tested as text on a background.

## Testing

- `core`: unit tests for every rule in the engine, using fixed seeds. Fixtures use placeholder card
  text such as `Card 1`.
- `content`: schema validation of every deck.
- `tokens`: theme key parity and contrast thresholds for the listed text and background pairings.
- `apps/mobile`: component and screen tests with React Native Testing Library. Query by accessible
  role and name first. A test id is a last resort.
- The entry guard is tested against the real route tree with Expo Router's testing library, over
  an in-memory key-value store. `features/welcome/testing/appEnvironment` holds that setup, and any
  test that renders the route tree should use it.
- Every UI kit component has an accessible role and name, except `Character`, which is decorative
  and hidden from screen readers. Its tests read the drawn paths from the SVG tree.
- Reanimated runs under Jest through its own mock, set up in `jest.setup.js`, with a resolver in
  `jest.resolver.js` that loads the plain JavaScript worklets. The mock has no reduced motion hook,
  so the setup file adds one that returns false. It and `withRepeat` are `jest.fn`, so a test can
  turn reduced motion on or count the loops.
- `apps/mobile` tests have a 30 second limit, set once in `jest.config.js`. The first test in a file
  that renders loads React Native, compiles the Tailwind config, and for route tests loads every
  screen, and that work is several times slower on a loaded machine or with a cold cache. Do not
  raise the limit for a single test; fix the slow work instead.

## Checks and CI

Root scripts: `lint`, `typecheck`, `test`, and `check`, which runs all three. Run `pnpm check`
before pushing.

CI runs the same checks as parallel jobs, scoped to what a change affects. A `scope` job uses pnpm's
dependency graph to pick the changed packages and their dependents, and anything outside `apps/` and
`packages/` runs everything. `lint` runs on every change. `core`, `content`, `tokens` and `mobile` each run
their own `typecheck` and `test`. One aggregator job, `checks`, depends on all of them and is the
only required status, so a failing job blocks the merge and adding a job never touches branch
protection. There is no workflow-level path filter, so `checks` always reports. A newer push to a
pull request cancels its older run, pushes to `main` get their own scoped run, and a full run can be
started by hand. The shared setup lives in `.github/actions/setup`.

The `release-bundle` job runs only on that full run, so it costs nothing per push. It bundles the
Android release the way Gradle does: it runs the Expo CLI with plain `node` and `env -u NODE_PATH`,
without pnpm's `.bin` shim, which would put the hidden hoist on `NODE_PATH`. A package that
`apps/mobile` uses but does not declare, such as `babel-preset-expo`, then fails with "Cannot find
module". The job is skipped on pull requests and pushes, and `checks` treats a skipped job as a pass.
`.npmrc` stays free of hoisting settings, because they would hide the missing declarations.

Installable builds are made with EAS Build from `apps/mobile/eas.json`. The `preview` profile makes
an internal release APK that raises its version code on every build. The profiles pin Node 26.13.1
and pnpm 9.11.0, and the README has the steps.

The `production` profile makes the store builds: an Android app bundle and an iOS build with store
distribution. It raises the build number on every build (the number comes from EAS remote
versioning, and the version stays 1.0.0) and sets the `production` update channel. Its
`submit.production` block names, by path, the Apple API key and the Google service account key
under `apps/mobile/secrets/`. The block holds no key, and `.gitignore` covers the folder and `.p8`
files. Agents never run `eas build` or `eas submit`.

`app.json` holds the native settings a store build needs. On iOS: iPhone only, the encryption flag
`ITSAppUsesNonExemptEncryption` set to `true` (the answer in `docs/compliance.md`, since SQLCipher
ships), and a privacy manifest declaring the required reason APIs the app and its libraries use.
On Android: backups off, and `blockedPermissions` removing the permissions the app never uses.
Those are the three the Expo template adds (`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`,
`SYSTEM_ALERT_WINDOW`), `READ_MEDIA_IMAGES` and `DETECT_SCREEN_CAPTURE` from `expo-screen-capture`
(they serve its screenshot listener only), `com.google.android.c2dm.permission.RECEIVE` from the
Firebase Messaging library inside `expo-notifications` (push), and the launcher badge permissions
that the badge library inside `expo-notifications` declares. The reminder and the lock need none of
them. `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `USE_BIOMETRIC`, `USE_FINGERPRINT`, `VIBRATE`,
`INTERNET`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK` and `MODIFY_AUDIO_SETTINGS` stay.
`appConfig.test.ts` guards both lists. These native changes alter the runtime version
fingerprint, so the next build is a reinstall and updates made before it do not reach it.

## Privacy

- No analytics and no error reporting, at launch or before. The app has no SDK for either. Crash
  data comes only from what Apple and Google collect from players who opt in on their phones.
- The app makes one network call, the check for an update. It goes to Expo's update service
  (`u.expo.dev`) and sends the platform, the runtime version, the channel, the ids of the update the
  app is running and of the embedded build, a random install id that `expo-updates` makes (not tied
  to a person or a device), the update protocol versions, and the text of a crash from the previous
  launch if there was one. It sends no player names, card text, settings or anything typed. The
  request also reveals the phone's IP address to Expo, as any network request does. The crash text
  (`Expo-Fatal-Error`) holds whatever a thrown error's message holds. Because of the install id and
  the crash text, the store privacy answers probably become crash data and a device id, not linked
  to the user, which is an owner decision in FRK-79. `docs/compliance.md` checks every library
  against the answers, and it and the privacy policy now describe the update check.
- The privacy policy is one export, `privacyPolicy`, in `packages/content`. The settings screen
  shows it, and the owner hosts the same words at the URL given to the stores.
- The policy describes the launch build. `docs/compliance.md` lists what must be true before it is
  published: no Android backup, a device-only database key, the PIN hash and install marker, and
  Clear everything.
- A change that adds a network call, an SDK that sends data, a push token, or a new kind of stored
  data updates `docs/compliance.md` and `privacyPolicy` in the same pull request.
- Never log player names, card text or anything a player typed. That includes deck names, the
  database key and anything read from the personal store. The storage and provider tests spy on the
  console to check it. The same goes for the message of a thrown error, because a crash is reported
  to Expo. Never put player text in an `Error` message.
- What players write is stored in an encrypted database. The key is in the device secure store, on
  this device only, and clearing everything deletes both. See Storage.
- The PIN is never stored. Only a salted SHA-256 hash is, in the secure store, readable only while
  the phone is unlocked and only on this device. Nothing logs a PIN, a hash, a salt, a key or a
  stored value, and an error message never holds one. The secure storage, install marker, clear
  everything and lock tests spy on the console to check it. See App lock.
- A fresh install starts clean: the install marker clears secure items that iOS kept after a
  delete. Clear everything removes every stored item, the database and every scheduled
  notification. See Storage.
- The reminder is a local notification, so no push token is ever requested. Never call
  `getExpoPushTokenAsync` or `getDevicePushTokenAsync`. `expo-notifications` bundles the Firebase
  Messaging library on Android, which stays idle without a `google-services.json`, and the app has
  none. Its iOS privacy manifest declares only the user defaults reason that is already in
  `privacyManifests`, so that union did not change.
- Test fixtures contain placeholder text only.

## Working conventions

- One ticket, one branch, one pull request. Squash merge.
- A pull request is merged once CI has passed and the reviewer has approved it. `CLAUDE.md` has
  the rule under Development decisions.
- Branch names are the ticket id plus a short slug, for example `FRK-12/turn-screen`.

## Decisions still open

| Decision                               | Needed by        |
| -------------------------------------- | ---------------- |
| Launch platforms: iOS, Android or both | Launch milestone |

## Decisions

Each decision a ticket made that its description did not cover is one list entry in the file for
its area under `docs/decisions/`:

- [Project setup](decisions/project-setup.md)
- [Design tokens](decisions/design-tokens.md)
- [UI kit](decisions/ui-kit.md)
- [Screens](decisions/screens.md)
- [Content](decisions/content.md)
- [Round engine](decisions/round-engine.md)
- [Questions](decisions/questions.md)
- [Secret match](decisions/secret-match.md)
- [Storage](decisions/storage.md)
- [App lock](decisions/lock.md)
- [Privacy](decisions/privacy.md)
- [Press feedback and effects](decisions/feedback.md)
- [Updates](decisions/updates.md)
- [Builds and store submission](decisions/ci-and-builds.md)

A new decision goes at the end of its area's file, as one list entry:
`- **<decision>** (<ticket>): <reason>`. Do not use a table. A table is padded to its widest row, so
one wide row changes every other line and puts every open pull request in conflict. A new area gets
a new file and a link here.

`.gitattributes` sets `merge=union` on `docs/decisions/*.md`, so Git keeps both sides when two
branches add entries at the end of the same file. That applies to a local `git merge origin/main`
and to a rebase. GitHub's own mergeability check ignores it, so a pull request can still show a
conflict on GitHub that a local merge of `origin/main` resolves on its own.
