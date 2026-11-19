/**
 * The colours of the cast, as named slots. The art refers to a slot, never to a colour, so one
 * drawing serves both themes. Every character fills every slot. A slot a drawing does not use is
 * still given a sensible value.
 */
export type CharacterPalette = {
  // Shared by the whole cast
  ink: string; // lash lines, brows and the fine detail
  eyeWhite: string;
  mouth: string; // the inside of an open mouth
  tongue: string;
  teeth: string;
  blush: string;
  rim: string; // the sticker edge that lifts the figure off its ground
  sparkle: string; // glints and stars
  sweat: string;
  // Skin
  skin: string;
  skinShade: string;
  skinLight: string;
  // Hair
  hair: string;
  hairShade: string;
  hairLight: string;
  hairAlt: string; // a second hair colour: fade, roots or dye
  // Face detail
  iris: string;
  irisShade: string;
  lid: string; // eyeshadow on the lid
  lips: string;
  // Clothes
  outfit: string;
  outfitShade: string;
  outfitLight: string;
  trim: string; // a second garment or a pattern
  accent: string;
  accentShade: string;
  accentAlt: string;
  metal: string; // jewellery, glasses and studs
};

export type CharacterPaletteSet = { light: CharacterPalette; dark: CharacterPalette };

export type CharacterSlot = keyof CharacterPalette;

const sharedLight = {
  ink: '#1E1620',
  eyeWhite: '#FFFFFF',
  mouth: '#4A1020',
  tongue: '#FF6F86',
  teeth: '#FFFFFF',
  sparkle: '#FFF3B0',
  sweat: '#8FD3F4',
  rim: '#FFFFFF',
} as const;

// In the dark theme the figure stands on grape. The rim is a lighter violet so a black wolf cut
// and a dark outfit still read against it.
const darkRim = '#7C62C4';

const host: CharacterPaletteSet = (() => {
  const light: CharacterPalette = {
    ...sharedLight,
    blush: '#C2522B',
    skin: '#7A4528',
    skinShade: '#5F331C',
    skinLight: '#A8683F',
    hair: '#2E1B12',
    hairShade: '#1C100A',
    hairLight: '#5A3A2A',
    hairAlt: '#B24A1E',
    iris: '#8A5428',
    irisShade: '#4A2A14',
    lid: '#5F331C',
    lips: '#A24A3A',
    outfit: '#2F7D4F',
    outfitShade: '#235E3B',
    outfitLight: '#45A06B',
    trim: '#F2B632',
    accent: '#D2602D',
    accentShade: '#B24A1E',
    accentAlt: '#2BB5A0',
    metal: '#D99A4E',
  };
  return { light, dark: { ...light, rim: darkRim, hairLight: '#6B4733' } };
})();

const dealer: CharacterPaletteSet = (() => {
  const light: CharacterPalette = {
    ...sharedLight,
    blush: '#FF8FA3',
    skin: '#F8D8BC',
    skinShade: '#E7B596',
    skinLight: '#FFEBD9',
    hair: '#CDB8FF',
    hairShade: '#A98FEA',
    hairLight: '#EFE6FF',
    hairAlt: '#2A1F38',
    iris: '#2FB3AE',
    irisShade: '#1C7F7C',
    lid: '#F7C6C4',
    lips: '#EE6F8C',
    outfit: '#FFB3D9',
    outfitShade: '#E58EBB',
    outfitLight: '#FFD6EC',
    trim: '#1E1620',
    accent: '#FF3D7F',
    accentShade: '#C7195A',
    accentAlt: '#7FE7E0',
    metal: '#F2C14E',
  };
  return { light, dark: { ...light, rim: darkRim } };
})();

const hype: CharacterPaletteSet = (() => {
  const light: CharacterPalette = {
    ...sharedLight,
    blush: '#F08C7A',
    skin: '#F4C7A5',
    skinShade: '#DFA27F',
    skinLight: '#FFDDC2',
    hair: '#4A2E1C',
    hairShade: '#33200F',
    hairLight: '#7A5236',
    hairAlt: '#6A4428',
    iris: '#8A5A2E',
    irisShade: '#4F2E12',
    lid: '#DFA27F',
    lips: '#E8798A',
    outfit: '#F3F1F6',
    outfitShade: '#C9CCD8',
    outfitLight: '#FFFFFF',
    trim: '#4A5063',
    accent: '#FF3D7F',
    accentShade: '#C7195A',
    accentAlt: '#FFD23F',
    metal: '#D5CEE0',
  };
  return { light, dark: { ...light, rim: darkRim, hairLight: '#8A6240' } };
})();

const gatekeeper: CharacterPaletteSet = (() => {
  const light: CharacterPalette = {
    ...sharedLight,
    blush: '#E58AC0',
    skin: '#F5EBF6',
    skinShade: '#DCCAE8',
    skinLight: '#FFF9FF',
    hair: '#251C31',
    hairShade: '#120D19',
    hairLight: '#5A4880',
    hairAlt: '#2C2140',
    iris: '#A77BEA',
    irisShade: '#6C46B8',
    lid: '#7A5496',
    lips: '#B03A66',
    outfit: '#231A2E',
    outfitShade: '#150F1D',
    outfitLight: '#3C2E52',
    trim: '#8E86A0',
    accent: '#B58CFF',
    accentShade: '#7D52D6',
    accentAlt: '#FF3D7F',
    metal: '#D5CEE0',
  };
  return {
    light,
    dark: {
      ...light,
      rim: darkRim,
      hairLight: '#7058A6',
      hairAlt: '#3A2C58',
      outfit: '#2E2340',
      outfitShade: '#1D152B',
      outfitLight: '#4E3D70',
    },
  };
})();

const shy: CharacterPaletteSet = (() => {
  const light: CharacterPalette = {
    ...sharedLight,
    blush: '#E0606E',
    skin: '#8A5533',
    skinShade: '#6E4026',
    skinLight: '#A86C44',
    hair: '#1E1510',
    hairShade: '#120C08',
    hairLight: '#4A372B',
    hairAlt: '#3A2A20',
    iris: '#6B3A1E',
    irisShade: '#3E200E',
    lid: '#6E4026',
    lips: '#A0503C',
    outfit: '#F2B632',
    outfitShade: '#D99A1E',
    outfitLight: '#FFD66B',
    trim: '#BFE3F5',
    accent: '#2BB5A0',
    accentShade: '#1F8F7E',
    accentAlt: '#FF3D7F',
    metal: '#E8B13A',
  };
  return { light, dark: { ...light, rim: darkRim, hairLight: '#6A503E', hairAlt: '#54402F' } };
})();

export const characterPalettes: {
  host: CharacterPaletteSet;
  dealer: CharacterPaletteSet;
  hype: CharacterPaletteSet;
  gatekeeper: CharacterPaletteSet;
  shy: CharacterPaletteSet;
} = { host, dealer, hype, gatekeeper, shy };
