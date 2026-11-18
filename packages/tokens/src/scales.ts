export const spacingScale = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;

export const radiusScale = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

// A font family name is the name the app registers the font file under. Each weight is its own
// family because native text does not pick a weight out of one family reliably.
export const typeScale = {
  display: { fontFamily: 'Baloo2_800ExtraBold', fontSize: 34, lineHeight: 38 },
  title: { fontFamily: 'Baloo2_800ExtraBold', fontSize: 26, lineHeight: 30 },
  heading: { fontFamily: 'Baloo2_800ExtraBold', fontSize: 20, lineHeight: 26 },
  body: { fontFamily: 'Nunito_500Medium', fontSize: 16, lineHeight: 22 },
  bodyBold: { fontFamily: 'Nunito_700Bold', fontSize: 16, lineHeight: 22 },
  label: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: 'Nunito_800ExtraBold', fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TypeStyle>;
