import type { CharacterArt, CharacterMood, Limb, MoodArt, Shape } from './types';

/** Any character's art, with its moods read loosely so a mood can be looked up by a plain value. */
export type AnyCharacterArt = Omit<CharacterArt<CharacterMood>, 'moods'> & {
  moods: Partial<Record<CharacterMood, MoodArt>>;
};

export type LayerName =
  | 'hairBack'
  | 'body'
  | 'armLeft'
  | 'armRight'
  | 'head'
  | 'irises'
  | 'face'
  | 'blink'
  | 'hairFront'
  | 'handLeft'
  | 'handRight';

export type Layer = { name: LayerName; shapes: Shape[] };

/** The art of a mood. An unknown mood gives the idle one, so a bad value never throws on a phone. */
export function moodArtOf(art: AnyCharacterArt, mood: CharacterMood): MoodArt {
  const moodArt = art.moods[mood] ?? art.moods.idle;
  if (moodArt === undefined) throw new Error('A character must have an idle mood');
  return moodArt;
}

/**
 * The layers of one mood, from back to front. The component wraps each layer in its own animated
 * view, and the preview script draws the same list as still SVG, so the two cannot drift apart.
 * A still picture leaves out the blink layer, which is only shown for a moment. The eye whites
 * belong to the head layer, so they are drawn before the irises.
 */
export function composeLayers(art: AnyCharacterArt, mood: CharacterMood): Layer[] {
  const moodArt = moodArtOf(art, mood);
  const { face } = moodArt;
  const behind = (limb: Limb) => (limb.inFront ? [] : limb.shapes);
  const inFront = (limb: Limb) => (limb.inFront ? limb.shapes : []);
  return [
    { name: 'hairBack', shapes: art.hairBack },
    { name: 'body', shapes: moodArt.body ?? art.body },
    { name: 'armLeft', shapes: behind(moodArt.armLeft) },
    { name: 'armRight', shapes: behind(moodArt.armRight) },
    { name: 'head', shapes: [...art.head, ...face.whites] },
    { name: 'irises', shapes: face.irises },
    { name: 'face', shapes: [...face.lids, ...face.brows, ...face.mouth, ...face.extras] },
    { name: 'blink', shapes: face.blink },
    { name: 'hairFront', shapes: art.hairFront },
    { name: 'handLeft', shapes: inFront(moodArt.armLeft) },
    { name: 'handRight', shapes: inFront(moodArt.armRight) },
  ];
}
