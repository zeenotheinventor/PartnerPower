# The cast

The five characters of Get Freak, drawn in code. Each one is a plain TypeScript data file. The
`Character` component in `components/ui/Character` draws it with `react-native-svg` and animates it
with Reanimated. This folder holds no React. Read this file before you draw or redraw a character.

## The cast and their ids

Code uses the role id and never the display name. Names are content (`characterNames` in
`packages/content`).

| Id           | Role              | File            | Poses besides the four base moods |
| ------------ | ----------------- | --------------- | --------------------------------- |
| `host`       | Hosts the hub     | `host.ts`       | `wave`                            |
| `dealer`     | Deals the cards   | `dealer.ts`     | none                              |
| `hype`       | Celebrates a dare | `hype.ts`       | `celebrate`                       |
| `gatekeeper` | Guards the gate   | `gatekeeper.ts` | `armsCrossed`                     |
| `shy`        | Fronts Drink If   | `shy.ts`        | `flustered`, `coverEyes`          |

`gatekeeper.ts` is the finished reference. The other four are placeholders that are to be redrawn.
Redraw a character inside its own file and leave `types.ts` and `compose.ts` alone. If the model
cannot say something you need, ask for a change to it rather than working around it.

## The model

The canvas is 240 by 240 units. A bust fills it and is cut flat at the bottom edge. The `head` crop
is the square `49 19 143 143`, which tiles of 64 dp use. Draw so that the head crop reads on its own.

A character is a `CharacterArt` (see `types.ts`). Every list is an ordered list of `Shape`s, drawn
first to last:

```ts
type Shape = { d: string; fill?: Slot; stroke?: Slot; strokeWidth?: number; opacity?: number };
```

- `d` is an SVG path made of absolute or relative commands and numbers. It is authored data, so
  write the numbers out. Nothing is built at run time. Strokes always have round caps and joins.
- `fill` and `stroke` are palette slot names, never colours. Both themes use the same drawing.
- A shape with only a stroke is not filled, and a shape with only a fill has no stroke.

| Field       | What it is                                                                   |
| ----------- | ---------------------------------------------------------------------------- |
| `hairBack`  | Hair behind the head and shoulders. Sways a little.                          |
| `body`      | Neck, shoulders and clothes. A mood can replace it with `MoodArt.body`.      |
| `head`      | The skin, ears, nose and anything fixed to the head below the eyes.          |
| `hairFront` | Hair and headwear in front of the face, and glasses. Sways from `hairPivot`. |
| `headPivot` | Where the head tilts, at the base of the neck.                               |
| `hairPivot` | Where the front hair swings from, at the crown.                              |
| `moods`     | One `MoodArt` for each mood the character supports.                          |

A `MoodArt` is the face, the two limbs and the motion the limbs make:

| Field                 | What it is                                                                     |
| --------------------- | ------------------------------------------------------------------------------ |
| `face.whites`         | The eye whites. They are drawn in the head layer, under the irises.            |
| `face.irises`         | Irises, pupils and glints. The component moves them to glance around.          |
| `face.lids`           | The upper lid, eyeshadow, lash line and wing. Drawn over the irises.           |
| `face.blink`          | The closed eye, shown for about 120 ms. Leave it empty if the eyes are closed. |
| `face.brows`          | Brows.                                                                         |
| `face.mouth`          | The mouth.                                                                     |
| `face.extras`         | Blush, sweat drops, sparkles. Over the face and under the front hair.          |
| `armLeft`, `armRight` | A `Limb`: its `shapes`, its `pivot`, and `inFront` to draw over the face.      |
| `motion`              | What the limbs do: `none`, `wave`, `pump`, `tap` or `peek`.                    |

"Left" and "right" are the viewer's left and right.

### Layers, back to front

`composeLayers` in `compose.ts` gives the order. The component and the preview script both use it.

`hairBack`, `body`, `armLeft`, `armRight`, `head` (the head shapes then the eye whites), `irises`,
`face` (lids, brows, mouth, extras), `blink`, `hairFront`, then the limbs that are `inFront`.

The head layer, the irises, the face, the blink and the front hair all move with the head. A limb
that is `inFront` draws over the face, which covering the eyes needs. Put an arm in front of the
head only when the pose needs it.

### Moods

The base moods are `idle`, `happy`, `flirty` and `shocked`. Every character has them. The pose moods
belong to one character each (`MoodsByCharacter` in `types.ts`), so a mood a character cannot show
fails typecheck.

What each mood should say:

- `idle` is the resting face. It is the first thing a player sees.
- `happy` closes the eyes in an arc and opens the mouth. Leave `blink` and `irises` empty.
- `flirty` lowers the lids, raises one brow and smirks. Keep the eyes open.
- `shocked` opens the eyes wide with small pupils, lifts the brows and rounds the mouth.

A pose mood adds limbs, and often a different face. The component plays a short reaction when the
mood changes (a hop for `happy`, `celebrate` and `wave`, a jolt for `shocked`, `flustered` and
`coverEyes`, a head tilt for `flirty` and `armsCrossed`) and then settles into the idle loop.

### Pivots and motion

A pivot is a point in canvas units. Put each one where the part really turns.

- A waving arm turns at the wrist. A pumping arm turns at the elbow.
- `motion: 'wave'` swings `armRight`. `'pump'` swings both arms in opposite directions.
  `'tap'` taps `armRight` down and up three times every few seconds. `'peek'` lowers both limbs and
  raises them again.
- The whole figure breathes and hops about the bottom centre of the canvas. You need nothing for it.

## Colours

Shapes name a slot from the palette. Every character has a light and a dark palette in
`packages/tokens/src/characters.ts`, and the component picks the one for the colour scheme.

- Shared: `ink`, `eyeWhite`, `mouth`, `tongue`, `teeth`, `blush`, `rim`, `sparkle`, `sweat`.
- Skin: `skin`, `skinShade`, `skinLight`.
- Hair: `hair`, `hairShade`, `hairLight`, `hairAlt` (a fade, roots or dye).
- Face: `iris`, `irisShade`, `lid` (eyeshadow), `lips`.
- Clothes: `outfit`, `outfitShade`, `outfitLight`, `trim`, `accent`, `accentShade`, `accentAlt`,
  `metal`.

Never write a colour in an art file. If you need a new slot, add it to every palette in the tokens
package, light and dark, and the parity test will check it.

Give each mass a base fill, a shade layer and a highlight layer, drawn from the slot family
(`skin`, `skinShade`, `skinLight`). Use `opacity` on a shade or highlight shape to soften it.

### The rim

`rim` is a sticker edge that lifts the figure off its ground. It is white in the light theme and a
lighter violet in the dark theme. Draw it as a fat stroke and fill of the silhouette, as the first
shapes of `hairBack` and `body`. In the dark theme it is what separates black hair from the grape
background, so do not skip it.

## Readability at 64 dp

A tile shows the head crop at 0.45 dp per unit. A bust at 96 dp shows 0.4 dp per unit. Rules that
keep a character readable there:

- A stroke that carries the face (lash line, brow, mouth, an arc eye) is at least 3 units wide.
  Nothing stroked is under 1 unit, and a test checks it. Fine strands of hair are decoration only.
- An eye is at least 20 units wide. An iris has a highlight of at least 4 units, because the glint
  is what makes the eye look alive.
- A mouth is at least 14 units wide, and its corners differ from the idle mouth in every mood.
- Do not rely on a gap narrower than 3 units, or on a shape with an opacity below 0.2, to be seen.
- Keep the head a clear silhouette. Hair that flicks out and a rim make it readable as a tile.
- Keep the shape count low. The test fails above 450 shapes per character.

## Previewing

The preview script draws every character and mood from these files and the palette tokens, on the
light and dark grounds, at 150, 96 and 64 dp, as one HTML file of plain SVG. It needs Node 26 and
nothing else. Run it from the repository root:

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON apps/mobile/characters/scripts/renderCastPreview.mjs cast-preview.html
```

Options:

- `--only gatekeeper` draws one character, and `--mood idle` draws one mood.
- `--zoom 2` doubles every size.
- `--view 60,60,120,120` draws one close-up of that part of the canvas (x, y, width, height), which
  is the quickest way to check an eye.

It draws the layers at rest. Motion needs a device, and the kit gallery shows it. Open `/dev/kit` in
a development build and look at the Cast section.

## Tests

`characters.test.ts` checks that every character has the four base moods and only its own poses,
that every shape names a slot that exists, that paths are well formed and that strokes are not
too thin. Run it with:

```sh
pnpm --filter @getfreak/mobile exec jest --runTestsByPath characters/characters.test.ts
```
