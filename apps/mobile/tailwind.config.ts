import { colorThemes, radiusScale, spacingScale, typeScale } from '@getfreak/tokens';
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import nativewindPreset from 'nativewind/preset';

import {
  colorUtilities,
  colorVariables,
  radiusUtilities,
  spacingUtilities,
  typeStyleUtilities,
} from './tailwind/tokenTheme';

// Both themes are written as CSS variables. The light values sit on :root and the dark values
// replace them when the device colour scheme is dark, so a class such as bg-background needs no
// dark: variant.
const tokenPlugin = plugin(({ addBase, addUtilities }) => {
  addBase({
    ':root': colorVariables(colorThemes.light),
    '@media (prefers-color-scheme: dark)': { ':root': colorVariables(colorThemes.dark) },
  });
  addUtilities(typeStyleUtilities(typeScale));
});

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './features/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [nativewindPreset],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ...colorUtilities(colorThemes.light),
    },
    spacing: spacingUtilities(spacingScale),
    borderRadius: { none: '0px', ...radiusUtilities(radiusScale) },
    // The type- classes are the only type system, so the stock size, weight and family classes go.
    fontSize: {},
    fontWeight: {},
    fontFamily: {},
  },
  plugins: [tokenPlugin],
};

export default config;
