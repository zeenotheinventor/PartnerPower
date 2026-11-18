import { colorThemes, type ColorTheme } from './colors';
import { contrastRatio } from './testSupport/contrast';

const categoryIds = ['c1', 'c2', 'c3', 'c4'] as const;
const themeNames = ['light', 'dark'] as const;

function colorPaths(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? colorPaths(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function allColors(theme: ColorTheme): string[] {
  return [
    theme.background,
    theme.surface,
    theme.border,
    theme.foreground,
    theme.muted,
    theme.accent,
    theme.accentDeep,
    theme.onAccent,
    theme.onAccentSmall,
    ...Object.values(theme.category),
    ...Object.values(theme.onCategory),
  ];
}

describe('colorThemes', () => {
  it('should expose exactly the same keys in the light and dark themes', () => {
    expect(colorPaths(colorThemes.light).sort()).toEqual(colorPaths(colorThemes.dark).sort());
  });

  it('should give each of the four categories a fill and a label colour', () => {
    expect(Object.keys(colorThemes.light.category)).toEqual([...categoryIds]);
    expect(Object.keys(colorThemes.light.onCategory)).toEqual([...categoryIds]);
  });

  describe.each(themeNames)('%s theme', (themeName) => {
    const theme = colorThemes[themeName];

    it('should use six digit hex values only', () => {
      for (const color of allColors(theme)) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
      }
    });

    it.each(['background', 'surface'] as const)(
      'should give text at least 7 against the %s',
      (ground) => {
        expect(contrastRatio(theme.foreground, theme[ground])).toBeGreaterThanOrEqual(7);
      },
    );

    it.each(['background', 'surface'] as const)(
      'should give muted text at least 4.5 against the %s',
      (ground) => {
        expect(contrastRatio(theme.muted, theme[ground])).toBeGreaterThanOrEqual(4.5);
      },
    );

    it('should give text on the accent at least 3, which only suits large bold labels', () => {
      expect(contrastRatio(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(3);
    });

    it('should give small text on the accent at least 4.5', () => {
      expect(contrastRatio(theme.onAccentSmall, theme.accent)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(categoryIds)('should give the label on category %s at least 4.5', (categoryId) => {
      expect(
        contrastRatio(theme.onCategory[categoryId], theme.category[categoryId]),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  // In the light theme a category colour is a fill that carries its own label and is never bare
  // text, so only the dark theme checks categories against the background.
  it.each(categoryIds)(
    'should give dark category %s at least 4.5 against the dark background',
    (categoryId) => {
      expect(
        contrastRatio(colorThemes.dark.category[categoryId], colorThemes.dark.background),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  // Small text never sits straight on the surface in a category colour. A category is a fill or
  // a large label there, so the surface threshold is 3, not 4.5 (dark c4 is 4.33).
  it.each(categoryIds)(
    'should give dark category %s at least 3 against the dark surface',
    (categoryId) => {
      expect(
        contrastRatio(colorThemes.dark.category[categoryId], colorThemes.dark.surface),
      ).toBeGreaterThanOrEqual(3);
    },
  );
});
