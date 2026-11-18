export type CategoryColors = { c1: string; c2: string; c3: string; c4: string };

export type ColorTheme = {
  background: string;
  surface: string;
  border: string;
  foreground: string;
  muted: string;
  accent: string;
  accentDeep: string;
  // Text on the accent reaches a contrast of 3 in both themes (3.37 in light), so use it only
  // for large bold labels.
  onAccent: string;
  // The label colour for small text on the accent, which reaches a contrast of 4.5 in both themes.
  onAccentSmall: string;
  category: CategoryColors;
  // The label colour that sits on each category fill.
  onCategory: CategoryColors;
};

const light: ColorTheme = {
  background: '#FFF0F4',
  surface: '#FFFFFF',
  border: '#F6C9D6',
  foreground: '#3A1730',
  muted: '#8A5B78',
  accent: '#FF3D7F',
  accentDeep: '#C7195A',
  onAccent: '#FFFFFF',
  onAccentSmall: '#3A1730',
  category: { c1: '#FFB547', c2: '#FF8A3D', c3: '#FF3D7F', c4: '#C2185B' },
  onCategory: { c1: '#3A1730', c2: '#3A1730', c3: '#3A1730', c4: '#FFFFFF' },
};

const dark: ColorTheme = {
  background: '#231340',
  surface: '#33205A',
  border: '#4C3380',
  foreground: '#FFF4FB',
  muted: '#C8B5E8',
  accent: '#FFD23F',
  accentDeep: '#C99A00',
  onAccent: '#2A1450',
  onAccentSmall: '#2A1450',
  category: { c1: '#FFC857', c2: '#FF9A4D', c3: '#FF5FA2', c4: '#FF4D5E' },
  onCategory: { c1: '#231340', c2: '#231340', c3: '#231340', c4: '#231340' },
};

export const colorThemes = { light, dark } as const;

export type ColorThemeName = keyof typeof colorThemes;
