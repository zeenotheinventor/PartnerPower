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
    dev/kit.tsx          gallery of the UI kit, development builds only
    games/
      dares/
        _layout.tsx      holds the round for this route group
        setup.tsx
        play.tsx
        summary.tsx
  components/ui/         the UI kit
  components/FontGate/   holds rendering until the bundled fonts are ready
  fonts/                 the font files the type scale uses
  tailwind/              turns the tokens into the Tailwind theme
  features/              screen-level components, one folder per game
  features/dev/          development-only screens, such as the UI kit gallery
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

### UI kit

`components/ui` holds the shared components, one folder each, imported from the barrel
`components/ui`.

| Component   | What it is, and its role and name                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Screen`    | The screen shell: safe area, themed background, padding and optional scrolling. A layout container with no role. A screen's name is its `Header` heading. |
| `Button`    | Role `button`, named by its label. Primary and secondary variants.                                                                                        |
| `Card`      | A static card is one accessible group named by its text, so it must not contain controls. With `onPress` it is a `button` named by its `label`.           |
| `Toggle`    | Role `switch`, named by its label, with a checked and a disabled state.                                                                                   |
| `Chip`      | A pressable chip is a `button` with a selected state. A static chip is plain text.                                                                        |
| `TextField` | A labelled text input. React Native has no role for a text field, so it is found by its label.                                                            |
| `Header`    | The title has role `header`. The optional back control is a `button` named by the caller.                                                                 |

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
- `CategoryId` is typed locally in `components/ui` until the content model lands in `core`.

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
- Branch names are the ticket id plus a neutral slug, for example `FRK-12/turn-screen`.
- The tone rules in `CLAUDE.md` apply to code, comments, commits and pull requests.

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
| Node version                        | Node 26, the active long-term support line, decided by the owner on 2026-11-18. Node 24 is the fallback if a dependency fails on 26.                                                                                                        | FRK-1  |
| App name and identifiers            | The app is Get Freak: display name `Get Freak`, slug `get-freak`, scheme `getfreak`, store id `com.sojisoft.getfreak`, packages `@getfreak/*`. Decided by the owner on 2026-11-18.                                                          | FRK-1  |
