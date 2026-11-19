import type { CharacterId } from '@getfreak/core';
import type { CharacterSlot } from '@getfreak/tokens';

/** One filled or stroked path. Colours are palette slot names, never colour values. */
export type Shape = {
  d: string;
  fill?: CharacterSlot;
  stroke?: CharacterSlot;
  strokeWidth?: number;
  opacity?: number;
};

export type Point = { x: number; y: number };

export type ViewBox = { x: number; y: number; width: number; height: number };

/** The canvas every character is drawn on. */
export const canvasSize = 240;

export const bustViewBox: ViewBox = { x: 0, y: 0, width: canvasSize, height: canvasSize };

/** A square crop of the head and neck, for tiles of 64 dp. */
export const headViewBox: ViewBox = { x: 49, y: 19, width: 143, height: 143 };

export type CharacterCrop = 'bust' | 'head';

export type CharacterSize = 'tile' | 'medium' | 'hero';

/** The size of each size name, in dp. */
export const sizeInDp: Record<CharacterSize, number> = { tile: 64, medium: 96, hero: 150 };

export type BaseMood = 'idle' | 'happy' | 'flirty' | 'shocked';

export type CharacterMood =
  BaseMood | 'flustered' | 'celebrate' | 'armsCrossed' | 'coverEyes' | 'wave';

/** The moods each character supports. A mood not listed here is a compile error. */
export type MoodsByCharacter = {
  host: BaseMood | 'wave';
  dealer: BaseMood;
  hype: BaseMood | 'celebrate';
  gatekeeper: BaseMood | 'armsCrossed';
  shy: BaseMood | 'flustered' | 'coverEyes';
};

export type MoodOf<Id extends CharacterId> = MoodsByCharacter[Id];

/** What a limb does while its mood is showing. */
export type LimbMotion = 'none' | 'wave' | 'pump' | 'tap' | 'peek';

/**
 * An arm or a hand that moves on its own. The pivot is where it turns, in canvas units. A limb that
 * is `inFront` is drawn over the face, which is what covering the eyes needs.
 */
export type Limb = {
  shapes: Shape[];
  pivot: Point;
  inFront?: boolean;
};

/** What the face shows in one mood. Each list is drawn in the order it is written. */
export type FaceArt = {
  /** The eye whites, under the irises. */
  whites: Shape[];
  /** Irises and pupils. The component moves these to glance around. */
  irises: Shape[];
  /** The upper lid, lash line and anything else over the irises. */
  lids: Shape[];
  /** The closed eye, shown for a blink. */
  blink: Shape[];
  brows: Shape[];
  mouth: Shape[];
  /** Blush, sweat, sparkles and the like, over the face and under the front hair. */
  extras: Shape[];
};

export type MoodArt = {
  /** Replaces the character's body in this mood, for a pose that moves the shoulders. */
  body?: Shape[];
  face: FaceArt;
  armLeft: Limb;
  armRight: Limb;
  motion: LimbMotion;
};

export type CharacterArt<Mood extends CharacterMood> = {
  /** Hair behind the head and shoulders. */
  hairBack: Shape[];
  /** Shoulders, neck and clothes. */
  body: Shape[];
  /** The head: skin, ears, nose and everything fixed to it below the eyes. */
  head: Shape[];
  /** Hair and headwear in front of the face. It sways. */
  hairFront: Shape[];
  /** Where the head tilts, at the base of the neck. */
  headPivot: Point;
  /** Where the front hair sways from, at the crown. */
  hairPivot: Point;
  moods: Record<Mood, MoodArt>;
};

export type CharacterRegistry = { [Id in CharacterId]: CharacterArt<MoodOf<Id>> };
