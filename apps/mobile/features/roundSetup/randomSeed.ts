const seedRange = 2 ** 32;

/** A whole number for the round engine's seed. The engine keeps 32 bits of it. */
export function randomSeed(): number {
  return Math.floor(Math.random() * seedRange);
}
