import { dealerArt } from './dealer';
import { gatekeeperArt } from './gatekeeper';
import { hostArt } from './host';
import { hypeArt } from './hype';
import { shyArt } from './shy';
import type { CharacterRegistry } from './types';

/** The one place a character's art is registered. */
export const characters: CharacterRegistry = {
  host: hostArt,
  dealer: dealerArt,
  hype: hypeArt,
  gatekeeper: gatekeeperArt,
  shy: shyArt,
};

export { composeLayers, moodArtOf } from './compose';
export type { AnyCharacterArt, Layer, LayerName } from './compose';
export { bustViewBox, canvasSize, headViewBox, sizeInDp } from './types';
export type {
  BaseMood,
  CharacterArt,
  CharacterCrop,
  CharacterMood,
  CharacterRegistry,
  CharacterSize,
  FaceArt,
  Limb,
  LimbMotion,
  MoodArt,
  MoodOf,
  MoodsByCharacter,
  Point,
  Shape,
  ViewBox,
} from './types';
