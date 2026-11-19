import { characterPalettes } from './characters';

const characterIds = Object.keys(characterPalettes);

describe('characterPalettes', () => {
  it('should hold the five roles', () => {
    expect(characterIds).toEqual(['host', 'dealer', 'hype', 'gatekeeper', 'shy']);
  });

  describe.each(characterIds)('%s', (characterId) => {
    const palettes = Object.entries(characterPalettes).find(([id]) => id === characterId)?.[1];

    it('should have the same slots in the light and dark palettes', () => {
      expect(Object.keys(palettes?.light ?? {}).sort()).toEqual(
        Object.keys(palettes?.dark ?? {}).sort(),
      );
    });

    it('should use six digit hex values only', () => {
      for (const palette of [palettes?.light, palettes?.dark]) {
        for (const value of Object.values(palette ?? {})) {
          expect(value).toMatch(/^#[0-9A-F]{6}$/);
        }
      }
    });
  });

  it('should give every character the same slots', () => {
    const slotLists = Object.values(characterPalettes).map((palettes) =>
      Object.keys(palettes.light).sort().join(','),
    );
    expect(new Set(slotLists).size).toBe(1);
  });

  it('should give the dark palette its own rim, so the figure separates from the grape ground', () => {
    for (const palettes of Object.values(characterPalettes)) {
      expect(palettes.dark.rim).not.toBe(palettes.light.rim);
    }
  });
});
