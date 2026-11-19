/**
 * The one vocabulary of interest tags. A tag on a secret match item and the same tag on a dare
 * link the two, so a couple's matches can suggest dares. Dares and secret match items may only
 * use tags from this list.
 */
export const interestTags = [
  'compliments',
  'memories',
  'talking',
  'eye-contact',
  'kissing',
  'neck',
  'cuddling',
  'massage',
  'touch',
  'teasing',
  'undressing',
  'clothes-on',
  'grinding',
  'fingers',
  'oral',
  'sixty-nine',
  'edging',
  'slow',
  'intense',
  'positions',
  'from-behind',
  'on-top',
  'standing',
  'new-places',
  'toys',
  'blindfold',
  'watching',
  'leading',
  'guiding',
] as const;

export type InterestTag = (typeof interestTags)[number];

export function isInterestTag(tag: string): tag is InterestTag {
  return interestTags.some((interestTag) => interestTag === tag);
}

/** Lists a problem for each tag that is not in the vocabulary, named by the item that carries it. */
export function findUnknownTags(
  items: readonly { id: string; tags?: readonly string[] }[],
): string[] {
  return items.flatMap((item) =>
    (item.tags ?? [])
      .filter((tag) => !isInterestTag(tag))
      .map((tag) => `${item.id}: unknown tag "${tag}"`),
  );
}
