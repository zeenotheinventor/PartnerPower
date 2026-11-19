import { characterIds } from '@getfreak/core';
import { characterPalettes } from '@getfreak/tokens';

import { characters } from './index';
import { composeLayers } from './compose';
import {
  bustViewBox,
  canvasSize,
  headViewBox,
  type BaseMood,
  type CharacterArt,
  type CharacterMood,
  type MoodArt,
  type Shape,
} from './types';

const baseMoods: BaseMood[] = ['idle', 'happy', 'flirty', 'shocked'];

const poseMoods = {
  host: ['wave'],
  dealer: [],
  hype: ['celebrate'],
  gatekeeper: ['armsCrossed'],
  shy: ['flustered', 'coverEyes'],
} as const;

/** Every shape the character can draw, in any mood. */
function allShapes<Mood extends CharacterMood>(art: CharacterArt<Mood>): Shape[] {
  const moodShapes = Object.values<MoodArt>(art.moods).flatMap((moodArt) => {
    const { face } = moodArt;
    return [
      ...(moodArt.body ?? []),
      ...face.whites,
      ...face.irises,
      ...face.lids,
      ...face.blink,
      ...face.brows,
      ...face.mouth,
      ...face.extras,
      ...moodArt.armLeft.shapes,
      ...moodArt.armRight.shapes,
    ];
  });
  return [...art.hairBack, ...art.body, ...art.head, ...art.hairFront, ...moodShapes];
}

describe('the character registry', () => {
  it('should register every character id', () => {
    expect(Object.keys(characters).sort()).toEqual([...characterIds].sort());
  });

  describe.each(characterIds)('%s', (id) => {
    const art = characters[id];
    const palette = characterPalettes[id].light;

    it.each(baseMoods)('should support the %s mood', (mood) => {
      expect(Object.keys(art.moods)).toContain(mood);
    });

    it('should support exactly its own pose moods and the four base moods', () => {
      expect(Object.keys(art.moods).sort()).toEqual([...baseMoods, ...poseMoods[id]].sort());
    });

    it('should refer only to slots that exist in its palette', () => {
      const slots = new Set(Object.keys(palette));
      for (const shape of allShapes(art)) {
        for (const slot of [shape.fill, shape.stroke]) {
          if (slot !== undefined) expect(slots).toContain(slot);
        }
      }
    });

    it('should give every shape a colour, and a width when it is stroked', () => {
      for (const shape of allShapes(art)) {
        expect(shape.fill ?? shape.stroke).toBeDefined();
        if (shape.stroke !== undefined) expect(shape.strokeWidth).toBeGreaterThan(0);
      }
    });

    it('should hold only path data made of numbers and path commands', () => {
      for (const shape of allShapes(art)) {
        expect(shape.d).toMatch(/^[MLHVCSQTAZmlhvcsqtaz0-9.,\- ]+$/);
      }
    });

    it('should keep every stroke at 1 unit or more, so it survives a 64 dp tile', () => {
      for (const shape of allShapes(art)) {
        if (shape.stroke !== undefined) expect(shape.strokeWidth).toBeGreaterThanOrEqual(1);
      }
    });

    it('should keep the shape count reasonable for a phone', () => {
      expect(allShapes(art).length).toBeLessThan(450);
    });

    it('should keep every pivot on the canvas', () => {
      const points = [art.headPivot, art.hairPivot];
      for (const moodArt of Object.values<MoodArt>(art.moods)) {
        points.push(moodArt.armLeft.pivot, moodArt.armRight.pivot);
      }
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(canvasSize);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(canvasSize);
      }
    });

    it('should draw the eyes of an open eyed mood in four parts the component can animate', () => {
      const { face } = art.moods.idle;
      expect(face.whites.length).toBeGreaterThan(0);
      expect(face.irises.length).toBeGreaterThan(0);
      expect(face.blink.length).toBeGreaterThan(0);
    });

    it('should compose the layers from back to front', () => {
      const names = composeLayers(art, 'idle').map((layer) => layer.name);
      expect(names).toEqual([
        'hairBack',
        'body',
        'armLeft',
        'armRight',
        'head',
        'irises',
        'face',
        'blink',
        'hairFront',
        'handLeft',
        'handRight',
      ]);
    });
  });
});

describe('the canvas', () => {
  it('should be square, with the head crop inside it', () => {
    expect(bustViewBox).toEqual({ x: 0, y: 0, width: canvasSize, height: canvasSize });
    expect(headViewBox.width).toBe(headViewBox.height);
    expect(headViewBox.x + headViewBox.width).toBeLessThanOrEqual(canvasSize);
    expect(headViewBox.y + headViewBox.height).toBeLessThanOrEqual(canvasSize);
  });
});
