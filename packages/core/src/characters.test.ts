import { characterIds, isCharacterId } from './characters';

describe('characterIds', () => {
  it('should list the five roles in cast order', () => {
    expect(characterIds).toEqual(['host', 'dealer', 'hype', 'gatekeeper', 'shy']);
  });
});

describe('isCharacterId', () => {
  it('should accept a role id', () => {
    expect(isCharacterId('gatekeeper')).toBe(true);
  });

  it('should reject a display name, because code never addresses a character by name', () => {
    expect(isCharacterId('Nyx')).toBe(false);
  });
});
