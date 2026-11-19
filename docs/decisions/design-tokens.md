# Design tokens

- **Colours before the tokens package** (FRK-1): Two placeholder colours sat in the app's Tailwind config until FRK-3 created `packages/tokens`. They are gone.
- **Themes** (FRK-3): Light and dark, following the device, decided by the owner on 2026-11-18. Light is blush and cherry, dark is grape and sunny yellow. This replaces "dark theme first".
- **Typefaces** (FRK-3): Baloo 2 for display, titles and headings, Nunito for body, labels and captions, approved by the owner with the visual direction.
- **Category colours in the light theme** (FRK-3): The approved light category colours are too pale to read as text on the light background, so they are used as fills with their own label colour. The values were not changed.
- **Text on the accent colour** (FRK-3): White on the light accent has a contrast of 3.37, so it is limited to large bold labels. The values were not changed.
- **Small text on the accent colour** (FRK-13): A new token, `onAccentSmall` (`text-on-accent-small`), keeps the pink accent fill and gives small labels on it enough contrast. Light is `#3A1730` (4.63 on `#FF3D7F`), dark is `#2A1450` (11.06 on `#FFD23F`). The accent chip uses it.
- **Together card tint** (FRK-13): The design's soft accent tint at the top of a together card has no token, so it is left out. The card face stays the surface colour.
- **Spacing and radius utility names** (FRK-3): Named by pixel value (`p-16` is 16px), because NativeWind's default rem is 14px and would not give the token sizes.
- **Design sizes off the scales** (FRK-4): The design's 14, 16 and 22px radii use the nearest scale value, and cards have a 2px border and a 4px edge where the design shows 3 and 6.
- **Palettes in tokens, as named slots** (FRK-18): Each character has a light and a dark palette of the same slots in `packages/tokens`. The art names a slot and never a colour, so one drawing serves both themes. A `rim` slot separates the figure from the dark background.
- **The `danger` token trio** (FRK-63): `danger`, `dangerDeep` and `onDanger`, from design m4. Light is `#B3261E`, `#7A1912` and `#FFFFFF`. Dark is `#FF8A80`, `#C2453D` and `#231340`. One trio serves the destructive button, the destructive row and every error line, with no separate error colour. Tests hold the label on the fill at 4.5 or more, and `danger` on the background and on the surface at 4.5 or more, in both themes.
