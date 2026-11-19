/**
 * The cast, addressed by role and never by display name, because a name can change. The names and
 * personality lines are content.
 */
export const characterIds = ['host', 'dealer', 'hype', 'gatekeeper', 'shy'] as const;

export type CharacterId = (typeof characterIds)[number];

export function isCharacterId(value: string): value is CharacterId {
  return characterIds.some((characterId) => characterId === value);
}
