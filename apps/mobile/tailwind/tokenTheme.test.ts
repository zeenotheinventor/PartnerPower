import { colorThemes, radiusScale, spacingScale, typeScale } from '@getfreak/tokens';

import {
  colorUtilities,
  colorVariables,
  radiusUtilities,
  spacingUtilities,
  typeStyleUtilities,
} from './tokenTheme';

describe('colorVariables', () => {
  it('should name a variable for every colour, joining nested names with dashes', () => {
    expect(colorVariables(colorThemes.light)).toMatchObject({
      '--color-background': colorThemes.light.background,
      '--color-accent-deep': colorThemes.light.accentDeep,
      '--color-on-accent': colorThemes.light.onAccent,
      '--color-category-c1': colorThemes.light.category.c1,
      '--color-on-category-c4': colorThemes.light.onCategory.c4,
    });
  });

  it('should give the light and dark themes the same variable names', () => {
    expect(Object.keys(colorVariables(colorThemes.dark))).toEqual(
      Object.keys(colorVariables(colorThemes.light)),
    );
  });
});

describe('colorUtilities', () => {
  it('should point every colour at its variable so the theme can change underneath', () => {
    expect(colorUtilities(colorThemes.light)).toMatchObject({
      background: 'var(--color-background)',
      foreground: 'var(--color-foreground)',
      'accent-deep': 'var(--color-accent-deep)',
      category: { c1: 'var(--color-category-c1)', c4: 'var(--color-category-c4)' },
      'on-category': { c3: 'var(--color-on-category-c3)' },
    });
  });

  it('should not contain any raw colour value', () => {
    expect(JSON.stringify(colorUtilities(colorThemes.light))).not.toContain('#');
  });
});

describe('spacingUtilities', () => {
  it('should key each step by its size in points and give it in px', () => {
    expect(spacingUtilities(spacingScale)).toEqual({
      0: '0px',
      4: '4px',
      8: '8px',
      12: '12px',
      16: '16px',
      20: '20px',
      24: '24px',
      32: '32px',
      40: '40px',
      48: '48px',
      64: '64px',
    });
  });
});

describe('radiusUtilities', () => {
  it('should give each radius in px', () => {
    expect(radiusUtilities(radiusScale)).toEqual({
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      pill: '999px',
    });
  });
});

describe('typeStyleUtilities', () => {
  it('should give each style a type- class with family, size and line height in px', () => {
    expect(typeStyleUtilities(typeScale)['.type-display']).toEqual({
      fontFamily: 'Baloo2_800ExtraBold',
      fontSize: '34px',
      lineHeight: '38px',
    });
  });

  it('should dash-case multi word style names', () => {
    expect(Object.keys(typeStyleUtilities(typeScale))).toContain('.type-body-bold');
  });
});
