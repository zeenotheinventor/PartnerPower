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
| Styling        | NativeWind utilities over design tokens, in a light and a dark theme                                                         |
| Fonts          | Baloo 2 and Nunito, bundled with the app through `expo-font`                                                                 |
| Storage        | `expo-sqlite`, through its key-value store                                                                                   |
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
  setupRoute: string;
}
```

`core` exports the entries as one ordered list, `gameEntries`. The hub renders that list. Titles and
descriptions come from `content`, in `displayNames`, which is keyed by game id and typed from
`GameId`, so a registered game without a title and description fails typecheck.

The hub joins each entry with its names and hands the result to a list component that knows nothing
about any particular game. An available game's tile opens its `setupRoute`. A coming soon game's
tile is disabled and carries a marker.

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
carries `player`.

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

User-facing copy also lives in `content`, in one module, in British English. Screens never hold
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
  components/ui/         the UI kit
  components/FontGate/   holds rendering until the bundled fonts are ready
  components/EntryStack/ the root navigator, with the entry guard
  settings/              the settings context, including the remembered player names and the sound and vibration switches
  feedback/              the press feedback module: sound and haptic for each moment
  assets/sounds/         the button sounds, with a README about where they come from
  scripts/               `generateSounds.mjs`, which makes the sounds
  fonts/                 the font files the type scale uses
  tailwind/              turns the tokens into the Tailwind theme
  features/              screen-level components, one folder per game
  features/hub/          the hub: the first screen, with a tile for each game and a Settings button
  features/settings/     the settings screen
  features/round/        the round context for the dares route group
  features/roundSetup/   the round setup screen
  features/roundPlay/    the play screen: the card, the step up and pass the phone screens, the end round dialog
  features/roundSummary/ the end of round summary screen and the player score block
  features/welcome/      the entry confirmation screens
  features/dev/          development-only screens, such as the UI kit gallery
  storage/               the storage module
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

### Summary screen

`features/roundSummary/RoundSummaryScreen` shows `summarise` of the round from `useRound()`. Nothing
on it is stored or logged.

- The heading is "Round over!", with a line giving the cards played and the categories reached,
  in the singular for one. Each player has a `PlayerScore` block that reads as one group, such as
  "Alex, 8 dares done, 2 drinks, boldest". The boldest player's block carries a "Boldest" badge.
  A tie has no badge, and its line says so. The character line is plain text in a bordered box.
  There is no art and no confetti yet.
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

- Each card can come with two screens before it, in this order. If `current.steppingUp` is true,
  the step up screen names the new category and what passing now costs. Then, if the player who
  holds the phone is not the one who held it for the previous card, or there was no previous
  card, the pass the phone screen names who receives it. Then the card shows. These screens are
  state of the play screen, kept with the card number they belong to, and are not routes.
- A `together` card uses the same card view with "Both of you" for the turn and a penalty line that
  says both drink. The card is edged in the accent colour with the accent depth edge, in place of
  the category colour, and has a Together chip above the category chip and a line naming both
  players. The buttons read "We did it" and "We drink", and send the same `done` and `pass`
  actions. The core already charges both players on a pass and keeps the turn order. The accent
  edge and chip are the `accent` option of `Card` and `Chip`.
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

### Entry guard

Until the player has confirmed on the `welcome` screen, no other screen exists. The screen asks the
player to confirm they are 18 or over, and its wording is in `content`.

- `components/EntryStack` is the root navigator. It renders nothing while the settings load, and
  after that it stays mounted. It uses Expo Router's protected groups: `welcome` is in a group that
  is open only until the player has confirmed, and every other route is in a group that is open
  only after. A deep link to a closed route, on a cold start or with the app already open, ends at
  `welcome`, and the closed screen never renders.
- A protected group only covers the routes listed in it, so every new route must be added to the
  second group in `EntryStack`. A route group with its own layout, such as `games/dares`, is one
  screen in that group and its routes sit inside it. A test walks the real route files under
  `app/` and fails if any of them can be opened before confirming.
- `welcome` only stores the confirmation. The navigator reacts to the setting, sends the player to
  the first screen, and leaves nothing to go back to.
- Declining stores nothing. The closing screen is state inside the `welcome` route, not a route of
  its own, and it offers only a way back to the question.
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

| Component          | What it is, and its role and name                                                                                                                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Screen`           | The screen shell: safe area, themed background, padding, optional scrolling and optional keyboard avoidance (`avoidKeyboard`, which wraps the content in a `KeyboardAvoidingView` with padding). A layout container with no role. A screen's name is its `Header` heading.                                                                    |
| `Button`           | Role `button`, named by its label. Primary and secondary variants. A press gives feedback, see Press feedback below.                                                                                                                                                                                                                          |
| `Card`             | A static card is one accessible group named by its text, so it must not contain controls. With `grouped={false}` its children are read separately, which a card holding a heading needs. With `onPress` it is a `button` named by its `label`. `accent` edges it in the accent colour with the accent depth edge, and wins over `category`.   |
| `Toggle`           | Role `switch`, named by its label, with a checked and a disabled state. An optional `description` is drawn under the label in the muted body style and is the switch's accessibility hint.                                                                                                                                                    |
| `SegmentedControl` | A group of radios with a visible label. Each option is a `radio` named by its label, with a checked state. The group carries the radio group role and the label as its name, but is not an accessibility element, because that would hide its radios. The visible label is left readable so a screen reader reads it once before the options. |
| `CategoryToggle`   | A `switch` named by its label, filled with its category colour when on and dashed when off. `locked` keeps it on, announces it as disabled and picks it out with a foreground border instead of dimming it. `lockedHint` is its accessibility hint, so a screen reader says why it does nothing.                                              |
| `Chip`             | A pressable chip is a `button` with a selected state. A static chip is plain text. `accent` fills it with the accent colour and sets its text in `on-accent-small`, and wins over `category`.                                                                                                                                                 |
| `TextField`        | A labelled text input. React Native has no role for a text field, so it is found by its label.                                                                                                                                                                                                                                                |
| `Header`           | The title has role `header`. The optional back control is a `button` named by the caller.                                                                                                                                                                                                                                                     |

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

## Press feedback

`apps/mobile/feedback` gives a press a sound and a haptic in one call. It sits beside `settings` and
`storage`, not under `features`, because the UI kit `Button` uses it.

- There are four moments: `tap`, `done`, `pass` and `roundComplete`. `useFeedback()` returns one call
  for each. A call plays the moment's sound first and then fires its haptic, in the same call, so
  they land together. `roundComplete` has a haptic and no sound.
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
  cannot be taken for a press.
- The sounds are in `assets/sounds` and are original. `scripts/generateSounds.mjs` makes them, and
  the folder README says so and lists the alternatives. A test reads the shipped files and checks
  they are short, mono, 16-bit and quiet.
- Native modules are not available under Jest. `jest.setup.js` replaces `expo-audio` and
  `expo-haptics` with stand-ins that do nothing for every test, and a test that checks what was
  asked of them mocks them itself. Route tests replace the native device with one recording device,
  `feedbackDevice` in `features/welcome/testing/appEnvironment`.

## Settings screen

`features/settings/SettingsScreen` is the `/settings` route. It shows the `Header` with a back button
and the title, then one static `Card` (not grouped, so each switch is read on its own) holding two
`Toggle` rows, Sounds and Vibration, with a divider between them. Each caption is the toggle's
`description`, so it is also the switch's hint. A change is
stored at once through the settings context. The hub has a secondary Settings button below the game
tiles, pushed to the bottom by a flexible spacer. The dev kit link stays below it, in development builds only. The route is in the second protected group of `EntryStack`, so it is closed until the player
has confirmed. Back goes to the hub, and a deep link with nothing behind it replaces the screen with
the hub. All its text is in `content`.

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

- It is backed by the key-value store that ships with `expo-sqlite`.
- Keys are a closed union type. Every read is validated with a schema, and a value that fails
  validation is treated as absent.
- `clearAll` removes everything the app has stored. Tests cover it.
  Today the expo-sqlite key-value store is the only persistence, so clearing it is enough. Any
  later store (the encrypted database, files) must be added to `clearAll` in the same change.
- Milestones 1 and 2 store only settings. Nothing from a round is kept.

Later milestones store text that players write. Before that ships, the database moves to the
SQLCipher build that `expo-sqlite` supports through its config plugin, with the key held in
`expo-secure-store`. That is a native change and needs a new build.

## Styling

- Tokens are defined once in `packages/tokens`, as typed data: two colour themes with the same
  keys, a type scale, a spacing scale and a radius scale. `apps/mobile/tailwind.config.ts` feeds
  them to the Tailwind config that NativeWind reads.
- Screens and components use utility classes only. No raw colour values outside `tokens`, and no
  inline `style` objects. An ESLint rule fails on a hex colour or a colour function, such as
  `rgb()`, `hsl()` or `oklch()`, in JavaScript and TypeScript source outside `packages/tokens`, and
  a test does the same for the app's CSS files. Named colours such as `red`, and colours in JSON
  files such as `app.json`, are not checked, so review has to keep those out.
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
- Every UI kit component has an accessible role and name.
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

## Privacy

- No analytics and no error reporting in milestones 1 and 2. Both are decided in the launch
  milestone.
- Never log player names, card text or anything a player typed.
- Test fixtures contain placeholder text only.

## Working conventions

- One ticket, one branch, one pull request. Squash merge.
- A pull request is merged once CI has passed and the reviewer has approved it. `CLAUDE.md` has
  the rule under Development decisions.
- Branch names are the ticket id plus a short slug, for example `FRK-12/turn-screen`.

## Decisions still open

| Decision                                  | Needed by        |
| ----------------------------------------- | ---------------- |
| Launch platforms: iOS, Android or both    | Launch milestone |
| Whether an alternative forfeit mode ships | FRK-16           |
| Error reporting and analytics, if any     | Launch milestone |

## Decisions made

| Decision                                   | Outcome                                                                                                                                                                                                                                                                                                                                           | Ticket |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Expo SDK 57 or 58                          | Stay on SDK 57 (React Native 0.86), as the milestone brief specifies. SDK 58 is current, so plan an upgrade once the app is playable.                                                                                                                                                                                                             | FRK-1  |
| Colours before the tokens package          | Two placeholder colours sat in the app's Tailwind config until FRK-3 created `packages/tokens`. They are gone.                                                                                                                                                                                                                                    | FRK-1  |
| Themes                                     | Light and dark, following the device, decided by the owner on 2026-11-18. Light is blush and cherry, dark is grape and sunny yellow. This replaces "dark theme first".                                                                                                                                                                            | FRK-3  |
| Typefaces                                  | Baloo 2 for display, titles and headings, Nunito for body, labels and captions, approved by the owner with the visual direction.                                                                                                                                                                                                                  | FRK-3  |
| Category colours in the light theme        | The approved light category colours are too pale to read as text on the light background, so they are used as fills with their own label colour. The values were not changed.                                                                                                                                                                     | FRK-3  |
| Text on the accent colour                  | White on the light accent has a contrast of 3.37, so it is limited to large bold labels. The values were not changed.                                                                                                                                                                                                                             | FRK-3  |
| Small text on the accent colour            | A new token, `onAccentSmall` (`text-on-accent-small`), keeps the pink accent fill and gives small labels on it enough contrast. Light is `#3A1730` (4.63 on `#FF3D7F`), dark is `#2A1450` (11.06 on `#FFD23F`). The accent chip uses it.                                                                                                          | FRK-13 |
| Together card tint                         | The design's soft accent tint at the top of a together card has no token, so it is left out. The card face stays the surface colour.                                                                                                                                                                                                              | FRK-13 |
| Spacing and radius utility names           | Named by pixel value (`p-16` is 16px), because NativeWind's default rem is 14px and would not give the token sizes.                                                                                                                                                                                                                               | FRK-3  |
| Role and name for the screen shell         | The shell is a layout container with no role or name of its own. A label on a container that is not an accessibility element does nothing on iOS. The "role and name" criterion is applied to components that mean something by themselves.                                                                                                       | FRK-4  |
| Depth edge                                 | Built from layered views in token colours. Token-coloured shadows do not exist.                                                                                                                                                                                                                                                                   | FRK-4  |
| Design sizes off the scales                | The design's 14, 16 and 22px radii use the nearest scale value, and cards have a 2px border and a 4px edge where the design shows 3 and 6.                                                                                                                                                                                                        | FRK-4  |
| Entry guard mechanism                      | Protected groups on a navigator that stays mounted, plus a test over the real route files. A redirect in place of the navigator was tried and rejected: it looped on a deep link with the app open and re-read the settings on every flip.                                                                                                        | FRK-6  |
| Declining the entry confirmation           | Not stored, so the question is asked again at the next launch. The closing screen has a way back to the question.                                                                                                                                                                                                                                 | FRK-6  |
| A failed write when confirming             | The player is let in for that session and asked again at the next launch, so a storage fault does not lock them out.                                                                                                                                                                                                                              | FRK-6  |
| Built-in sitemap route                     | Turned off in `app.json`, because it sits outside the entry guard.                                                                                                                                                                                                                                                                                | FRK-6  |
| Game tiles on the hub                      | Both tiles are surface-coloured cards. The design fills the available game's tile with the accent colour and puts small text on it, which fails the rule that text on the accent is large and bold.                                                                                                                                               | FRK-7  |
| Round setup before its ticket              | The available game's tile opens a stand-in round setup screen, so the hub works end to end. The real screen replaces it in FRK-11.                                                                                                                                                                                                                | FRK-7  |
| Node version                               | Node 26, the active long-term support line, decided by the owner on 2026-11-18. Node 24 is the fallback if a dependency fails on 26.                                                                                                                                                                                                              | FRK-1  |
| App name and identifiers                   | The app is Get Freak: display name `Get Freak`, slug `get-freak`, scheme `getfreak`, store id `com.sojisoft.getfreak`, packages `@getfreak/*`. Decided by the owner on 2026-11-18.                                                                                                                                                                | FRK-1  |
| Not this one is not a penalty              | Skipping a card and switching a category off cost no drink and count as no dare done, and the card number does not move. The ticket says nobody drinks, and the engine's `removeCard` and `disableCategory` already work that way.                                                                                                                | FRK-14 |
| Staging after a replacement                | A replacement card shows at once, with no step up or pass the phone screen, even in a higher category. The same player holds the phone, and the new cost is in the card's penalty line.                                                                                                                                                           | FRK-14 |
| Switched off categories stay off           | A category already switched off shows in the sheet as off and locked, because the round has no action to switch one back on.                                                                                                                                                                                                                      | FRK-14 |
| Sheet frame, skip row                      | The design gives the skip row a 3px hard shadow and a 16px title. There is no shadow token, so the row has a plain border, and the title uses the 20px heading style, the nearest on the type scale.                                                                                                                                              | FRK-14 |
| Sheet frame, shape and spacing             | The design's 26, 14, 5 and 9px values use the nearest scale values: 24, 16, 4 and 12px. Its scrim is a fixed dark colour, and the build uses the background at 80%, as the end round dialog does.                                                                                                                                                 | FRK-14 |
| Sheet frame, quiet control                 | The design's 13px link text uses the 12px caption style, with a 48px touch area around it.                                                                                                                                                                                                                                                        | FRK-14 |
| Sheet frame, last category hint            | The design's sheet has no hint line. The sheet shows the setup hint when one category is left on, so the lock has a visible reason as well as a spoken one.                                                                                                                                                                                       | FRK-14 |
| For your partner means a solo card         | A player-written dare marked for your partner is a `solo` card, dealt to whoever's turn it is, as FRK-8 defines a card for one partner. Addressing a dare to one named partner is a separate product question.                                                                                                                                    | FRK-39 |
| Same base rules, different editorial rules | Player text follows the same length and repeat rules as shipped text, through `checkCardText`. The house style rules stay on shipped cards, because a couple writing for themselves know who they are.                                                                                                                                            | FRK-39 |
| Duplicates checked against shipped text    | A player cannot add a card the deck already has.                                                                                                                                                                                                                                                                                                  | FRK-39 |
| Mixing ratio of one half                   | With 30 or more shipped cards per category, a plain shuffle would rarely deal a couple's own dares in a 10 card round. One half shows them without crowding out the deck.                                                                                                                                                                         | FRK-39 |
| Timer cards are surprise only              | They are written to last the timer, so a normal deal would show them without a clock.                                                                                                                                                                                                                                                             | FRK-39 |
| Limits live in `cardText.ts`               | The limits are one `limits` constant, next to the text rules that use the card length. `contentModel.ts` imports it, so no module imports in a circle.                                                                                                                                                                                            | FRK-39 |
| Player card text is stored tidied          | `playerCardSchema` tidies the text, then checks it, so what is stored is what was checked.                                                                                                                                                                                                                                                        | FRK-39 |
| Press feedback libraries                   | `expo-audio` and `expo-haptics`, installed with `expo install` for SDK 57. Both need a new native build.                                                                                                                                                                                                                                          | FRK-26 |
| Button sounds are generated                | The three sounds are synthesised by `scripts/generateSounds.mjs`, so they are original and the project owns them, with no licence to record. Variant A ships, and two alternatives sit in `assets/sounds/alternatives` for the owner to swap in.                                                                                                  | FRK-26 |
| Audio session                              | Mix with other audio and respect the iOS silent switch, so a sound never stops or lowers music. The `expo-audio` plugin adds no microphone or background permissions.                                                                                                                                                                             | FRK-26 |
| Where press feedback lives                 | A top level `feedback` module beside `settings` and `storage`, not under `features`, because the UI kit `Button` depends on it and the kit should not import from a feature.                                                                                                                                                                      | FRK-26 |
| Button feedback option                     | `Button` has one `feedback` prop, `tap`, `done`, `pass` or `none`, that picks the sound and the haptic together. They are not set apart, so a moment never has a sound with the wrong haptic. Only the kit `Button` gives feedback.                                                                                                               | FRK-26 |
| Feedback with no provider                  | Calls do nothing, so a component renders alone. The route tests prove the real root layout wires the provider.                                                                                                                                                                                                                                    | FRK-26 |
| Android haptics                            | The view haptic effects, not the vibrator, so the phone's touch feedback setting is respected and no permission is needed. iOS uses its system generators, which follow System Haptics.                                                                                                                                                           | FRK-28 |
| Round complete haptic                      | A run of four pulses over about half a second, fired once from the summary screen when it first shows. The summary is where both ways of ending a round meet, so one guard gives once only.                                                                                                                                                       | FRK-28 |
| Settings screen captions                   | The kit `Toggle` has an optional `description`, drawn under the label and given as the switch's accessibility hint. The settings rows use it.                                                                                                                                                                                                     | FRK-26 |
| Format on the question                     | A question carries its own `format` and a deck can hold any mix. The content package ships one file per format, and a test checks that each file holds only its own format.                                                                                                                                                                       | FRK-34 |
| Discovery date format                      | An ISO date and time string, checked by the schema. Storage can keep it as text.                                                                                                                                                                                                                                                                  | FRK-34 |
| Surprise plan has its own generator        | The plan draws offsets and shuffles from a stream seeded from the round seed, so a round with surprises off deals exactly as before.                                                                                                                                                                                                              | FRK-43 |
| Stall rule                                 | A type with no eligible card for the rest of the round is dropped from the plan, so later blocks still get other types. A type that only does not fit this block, such as a jump at the top category, stays in the bag. Eligibility is checked against every enabled category, so it is conservative and never drops a type that could still fit. | FRK-43 |
| Free pass is given when dealt              | The pass is held from the moment the card is dealt, so it can be used on that card or kept. A skip or a category switch-off drops the surprise but keeps the pass.                                                                                                                                                                                | FRK-43 |
| Free pass waits for a choice               | `useFreePass` does nothing on an open choice, as on an unflipped mystery, because the card is not yet known.                                                                                                                                                                                                                                      | FRK-43 |
| Timer surprise needs a solo card           | The timer surprise only deals a solo timer card, as every surprise goes on a solo card.                                                                                                                                                                                                                                                           | FRK-43 |
| Turn moves only for the holder of the turn | A solo card moves the turn only when the player who played it is the one whose turn it was. A swap does not move it, and a swap dropped by a skip still keeps the alternation.                                                                                                                                                                    | FRK-43 |
| Replacement keeps the player               | `removeCard` and `disableCategory` keep the player who held the phone, so a dropped swap card is still played by the swapped partner.                                                                                                                                                                                                             | FRK-43 |
| Mystery cost in the history                | A passed mystery is recorded with its surprise and `summarise` adds one to its penalty, so no extra field is needed.                                                                                                                                                                                                                              | FRK-43 |
