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

| Concern    | Choice                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Runtime    | Node 26, pnpm                                                                                                      |
| App        | Expo SDK 57, React Native 0.86, React 19, TypeScript in strict mode                                                |
| Navigation | Expo Router, file-based                                                                                            |
| Styling    | NativeWind utilities over design tokens                                                                            |
| Storage    | `expo-sqlite`, through its key-value store                                                                         |
| Validation | Zod, in the core package                                                                                           |
| Tests      | Jest with `jest-expo` and React Native Testing Library for the app, Jest with `@swc/jest` for `core` and `content` |
| Checks     | ESLint flat config, Prettier, `tsc --noEmit`                                                                       |
| CI         | GitHub Actions                                                                                                     |

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

ESLint enforces these with import restrictions. A test in `core` fails if a React or Expo import
appears there.

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

The hub renders the list of entries. Titles and descriptions come from `content`, looked up by id.
Adding a game means adding an entry, a route group and a core module. The hub layout does not
change.

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

`core` owns these types and a Zod schema for `Deck`. `content` exports decks as data files and a
`displayNames` map for categories, levels and games. A test in `content` validates every deck
against the schema and checks that card ids are unique.

The `Card` type leaves room for later milestones through two optional fields that are not used yet:
`effect`, for cards that change the turn, and `source`, to tell a shipped card from one a player
wrote.

User-facing copy also lives in `content`, in one module, in British English. Screens never hold
string literals for copy.

## Round engine

A round of the `dares` game is a reducer in `core`.

```ts
interface RoundSetup {
  players: [string, string];
  level: LevelId;
  enabledCategories: CategoryId[];
  length: 10 | 20 | 'endless';
  seed: number;
}

type RoundAction =
  | { type: 'done' }
  | { type: 'pass' }
  | { type: 'removeCard' }
  | { type: 'disableCategory'; category: CategoryId }
  | { type: 'end' };

function startRound(setup: RoundSetup, deck: Deck): RoundState;
function reduceRound(state: RoundState, action: RoundAction): RoundState;
function summarise(state: RoundState): RoundSummary;
```

Rules the engine owns:

- Cards are dealt only from enabled categories, and no card repeats in a round.
- Turns alternate between the two players. A `together` card does not consume a turn.
- The round starts in the lowest enabled category and steps up as it progresses.
- Passing a card costs the category's penalty. Passing a `together` card costs both players.
- `removeCard` draws a replacement at no cost and keeps the removed card out of the round.
- All randomness comes from a seeded generator held in the state. The app supplies the seed, so
  tests are repeatable.

`RoundState` is plain serialisable data. The reducer never throws on a valid state and action. It
returns the same state for an action that does not apply.

## App structure

```
apps/mobile/
  app/
    _layout.tsx          root layout: providers and the entry guard
    index.tsx            hub
    welcome.tsx          entry confirmation, shown on first launch
    games/
      dares/
        _layout.tsx      holds the round for this route group
        setup.tsx
        play.tsx
        summary.tsx
  components/ui/         the UI kit
  features/              screen-level components, one folder per game
  storage/               the storage module
```

### State

- **Round state** lives in a `useReducer` inside the game's route group layout and is shared through
  context. It wraps `reduceRound` from `core`. Leaving the route group discards it.
- **Settings**, such as the entry confirmation and remembered player names, are read from storage at
  launch and exposed through a small settings context.
- There is no global store. If a later milestone needs state shared across games, add it then and
  record the choice here.

### Entry guard

The root layout reads the entry confirmation from settings before rendering any route. Until it is
set, every route redirects to `welcome`, including deep links. The specific wording and requirement
are in the ticket and in `content`.

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

- Tokens are defined once in `packages/tokens` and fed to the Tailwind config that NativeWind reads.
- Screens and components use utility classes only. No raw colour values outside `tokens`, and no
  inline `style` objects.
- Dark theme first. Each category id has a colour token, `category-c1` to `category-c4`.
- Until `packages/tokens` lands (FRK-3), the scaffold keeps two placeholder colours, `surface` and
  `ink`, in the app's Tailwind config. FRK-3 moves them into `tokens` and removes them from there.

## Testing

- `core`: unit tests for every rule in the engine, using fixed seeds. Fixtures use placeholder card
  text such as `Card 1`.
- `content`: schema validation of every deck.
- `apps/mobile`: component and screen tests with React Native Testing Library. Query by accessible
  role and name first. A test id is a last resort.
- Every UI kit component has an accessible role and name.

## Checks and CI

Root scripts: `lint`, `typecheck`, `test`, and `check`, which runs all three. Run `pnpm check`
before pushing.

CI runs the same checks as parallel jobs, scoped to what a change affects. A `scope` job uses pnpm's
dependency graph to pick the changed packages and their dependents, and anything outside `apps/` and
`packages/` runs everything. `lint` runs on every change. `core`, `content` and `mobile` each run
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
- Branch names are the ticket id plus a neutral slug, for example `FRK-12/turn-screen`.
- The tone rules in `CLAUDE.md` apply to code, comments, commits and pull requests.

## Decisions still open

| Decision                                  | Needed by        |
| ----------------------------------------- | ---------------- |
| Launch platforms: iOS, Android or both    | Launch milestone |
| Whether an alternative forfeit mode ships | FRK-16           |
| Error reporting and analytics, if any     | Launch milestone |

## Decisions made

| Decision                          | Outcome                                                                                                                                                                            | Ticket |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Expo SDK 57 or 58                 | Stay on SDK 57 (React Native 0.86), as the milestone brief specifies. SDK 58 is current, so plan an upgrade once the app is playable.                                              | FRK-1  |
| Colours before the tokens package | Two placeholder colours sit in the app's Tailwind config until FRK-3 creates `packages/tokens`.                                                                                    | FRK-1  |
| Node version                      | Node 26, the active long-term support line, decided by the owner on 2026-11-18. Node 24 is the fallback if a dependency fails on 26.                                               | FRK-1  |
| App name and identifiers          | The app is Get Freak: display name `Get Freak`, slug `get-freak`, scheme `getfreak`, store id `com.sojisoft.getfreak`, packages `@getfreak/*`. Decided by the owner on 2026-11-18. | FRK-1  |
