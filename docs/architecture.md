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

| Concern    | Choice                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Runtime    | Node 26, pnpm                                                                                                                |
| App        | Expo SDK 57, React Native 0.86, React 19, TypeScript in strict mode                                                          |
| Navigation | Expo Router, file-based                                                                                                      |
| Styling    | NativeWind utilities over design tokens, in a light and a dark theme                                                         |
| Fonts      | Baloo 2 and Nunito, bundled with the app through `expo-font`                                                                 |
| Storage    | `expo-sqlite`, through its key-value store                                                                                   |
| Validation | Zod, in the core package                                                                                                     |
| Tests      | Jest with `jest-expo` and React Native Testing Library for the app, Jest with `@swc/jest` for `core`, `content` and `tokens` |
| Checks     | ESLint flat config, Prettier, `tsc --noEmit`                                                                                 |
| CI         | GitHub Actions                                                                                                               |

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

interface Card {
  id: string;
  category: CategoryId;
  kind: CardKind;
  text: string;
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

`content` exports `decks` as data, `categoryNames` and `levelNames`, typed by id so a missing name
fails typecheck, and `displayNames` for games. A test in `content` validates every deck against the
schema and checks that card ids are unique across all decks.

The `Card` type leaves room for later milestones through two optional fields that are not used yet:
`effect`, a string for cards that change the turn, and `source`, `shipped` or `player`, to tell a
shipped card from one a player wrote.

User-facing copy also lives in `content`, in one module, in British English. Screens never hold
string literals for copy.

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

## App structure

```
apps/mobile/
  app/
    _layout.tsx          root layout: providers and the root navigator with the entry guard
    +not-found.tsx       sends an unknown path to the one screen that is open to the player
    index.tsx            hub
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
  settings/              the settings context, including the remembered player names
  fonts/                 the font files the type scale uses
  tailwind/              turns the tokens into the Tailwind theme
  features/              screen-level components, one folder per game
  features/hub/          the hub: the first screen, with a tile for each game
  features/round/        the round context for the dares route group
  features/roundSetup/   the round setup screen
  features/roundPlay/    the round screen. A stand-in until the turn screen is built.
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
- **Settings**, such as the entry confirmation and the remembered player names, are read from
  storage once at launch and exposed through a small settings context, `settings`. Saving the names
  never rejects: a failed write is ignored and the names still count for that session. The
  provider takes the storage to use as a prop, so tests pass an in-memory one. A failed read or an
  invalid stored
  value counts as not confirmed. If the write on confirming fails, the player is still let in for
  that session and is asked again at the next launch. Nothing in it logs.
- There is no global store. If a later milestone needs state shared across games, add it then and
  record the choice here.

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
| `Button`           | Role `button`, named by its label. Primary and secondary variants.                                                                                                                                                                                                                                                                            |
| `Card`             | A static card is one accessible group named by its text, so it must not contain controls. With `grouped={false}` its children are read separately, which a card holding a heading needs. With `onPress` it is a `button` named by its `label`.                                                                                                |
| `Toggle`           | Role `switch`, named by its label, with a checked and a disabled state.                                                                                                                                                                                                                                                                       |
| `SegmentedControl` | A group of radios with a visible label. Each option is a `radio` named by its label, with a checked state. The group carries the radio group role and the label as its name, but is not an accessibility element, because that would hide its radios. The visible label is left readable so a screen reader reads it once before the options. |
| `CategoryToggle`   | A `switch` named by its label, filled with its category colour when on and dashed when off. `locked` keeps it on, announces it as disabled and picks it out with a foreground border instead of dimming it. `lockedHint` is its accessibility hint, so a screen reader says why it does nothing.                                              |
| `Chip`             | A pressable chip is a `button` with a selected state. A static chip is plain text.                                                                                                                                                                                                                                                            |
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
  light theme its contrast is 3.37, which is not enough for small text.
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

| Decision                            | Outcome                                                                                                                                                                                                                                     | Ticket |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Expo SDK 57 or 58                   | Stay on SDK 57 (React Native 0.86), as the milestone brief specifies. SDK 58 is current, so plan an upgrade once the app is playable.                                                                                                       | FRK-1  |
| Colours before the tokens package   | Two placeholder colours sat in the app's Tailwind config until FRK-3 created `packages/tokens`. They are gone.                                                                                                                              | FRK-1  |
| Themes                              | Light and dark, following the device, decided by the owner on 2026-11-18. Light is blush and cherry, dark is grape and sunny yellow. This replaces "dark theme first".                                                                      | FRK-3  |
| Typefaces                           | Baloo 2 for display, titles and headings, Nunito for body, labels and captions, approved by the owner with the visual direction.                                                                                                            | FRK-3  |
| Category colours in the light theme | The approved light category colours are too pale to read as text on the light background, so they are used as fills with their own label colour. The values were not changed.                                                               | FRK-3  |
| Text on the accent colour           | White on the light accent has a contrast of 3.37, so it is limited to large bold labels. The values were not changed.                                                                                                                       | FRK-3  |
| Spacing and radius utility names    | Named by pixel value (`p-16` is 16px), because NativeWind's default rem is 14px and would not give the token sizes.                                                                                                                         | FRK-3  |
| Role and name for the screen shell  | The shell is a layout container with no role or name of its own. A label on a container that is not an accessibility element does nothing on iOS. The "role and name" criterion is applied to components that mean something by themselves. | FRK-4  |
| Depth edge                          | Built from layered views in token colours. Token-coloured shadows do not exist.                                                                                                                                                             | FRK-4  |
| Design sizes off the scales         | The design's 14, 16 and 22px radii use the nearest scale value, and cards have a 2px border and a 4px edge where the design shows 3 and 6.                                                                                                  | FRK-4  |
| Entry guard mechanism               | Protected groups on a navigator that stays mounted, plus a test over the real route files. A redirect in place of the navigator was tried and rejected: it looped on a deep link with the app open and re-read the settings on every flip.  | FRK-6  |
| Declining the entry confirmation    | Not stored, so the question is asked again at the next launch. The closing screen has a way back to the question.                                                                                                                           | FRK-6  |
| A failed write when confirming      | The player is let in for that session and asked again at the next launch, so a storage fault does not lock them out.                                                                                                                        | FRK-6  |
| Built-in sitemap route              | Turned off in `app.json`, because it sits outside the entry guard.                                                                                                                                                                          | FRK-6  |
| Game tiles on the hub               | Both tiles are surface-coloured cards. The design fills the available game's tile with the accent colour and puts small text on it, which fails the rule that text on the accent is large and bold.                                         | FRK-7  |
| Round setup before its ticket       | The available game's tile opens a stand-in round setup screen, so the hub works end to end. The real screen replaces it in FRK-11.                                                                                                          | FRK-7  |
| Node version                        | Node 26, the active long-term support line, decided by the owner on 2026-11-18. Node 24 is the fallback if a dependency fails on 26.                                                                                                        | FRK-1  |
| App name and identifiers            | The app is Get Freak: display name `Get Freak`, slug `get-freak`, scheme `getfreak`, store id `com.sojisoft.getfreak`, packages `@getfreak/*`. Decided by the owner on 2026-11-18.                                                          | FRK-1  |
