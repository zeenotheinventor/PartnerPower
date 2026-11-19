import { colorThemes } from '@getfreak/tokens';
import { act, screen } from 'nativewind/test';
import { StyleSheet } from 'react-native';
import { isHiddenFromAccessibility } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { renderThemed } from '../../../../tailwind/renderThemed';
import { burstMotion, effectDuration, splashMotion } from '../motion';
import type { PressEffect } from '../types';
import { PressEffectLayer } from './PressEffectLayer';

const bounds = { x: 20, y: 300, width: 160, height: 56 };
const doneEffect: PressEffect = { key: 1, kind: 'done', category: 'c2', bounds };
const passEffect: PressEffect = { key: 2, kind: 'pass', category: 'c2', bounds };

// The layer is hidden from screen readers, so every query for it has to include hidden elements.
const hidden = { includeHiddenElements: true };
const layerOf = () => screen.getByTestId('press-effect-layer', hidden);

/** Every colour the layer paints, as fills and as border colours, in lower case. */
function paintedColours() {
  const colours = new Set<string>();
  for (const node of layerOf().findAll(() => true)) {
    const style = StyleSheet.flatten(node.props.style);
    for (const colour of [style?.backgroundColor, style?.borderColor]) {
      if (typeof colour === 'string') colours.add(colour.toLowerCase());
    }
  }
  return colours;
}

describe('PressEffectLayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the Done effect', () => {
    it('should draw a core star and twelve particles', async () => {
      await renderThemed(<PressEffectLayer effect={doneEffect} onFinished={jest.fn()} />);

      expect(screen.getAllByTestId('burst-core', hidden)).toHaveLength(1);
      expect(screen.getAllByTestId('burst-particle', hidden)).toHaveLength(12);
      expect(burstMotion.particles).toHaveLength(12);
    });

    it('should paint only in the colour of the category of the card', async () => {
      await renderThemed(<PressEffectLayer effect={doneEffect} onFinished={jest.fn()} />);

      expect([...paintedColours()]).toEqual([colorThemes.light.category.c2.toLowerCase()]);
    });

    it('should paint in the colour of a different category when the card is in one', async () => {
      await renderThemed(
        <PressEffectLayer effect={{ ...doneEffect, category: 'c4' }} onFinished={jest.fn()} />,
      );

      expect([...paintedColours()]).toEqual([colorThemes.light.category.c4.toLowerCase()]);
    });

    it('should not draw the Pass ring or drops', async () => {
      await renderThemed(<PressEffectLayer effect={doneEffect} onFinished={jest.fn()} />);

      expect(screen.queryByTestId('splash-ring', hidden)).not.toBeOnTheScreen();
      expect(screen.queryAllByTestId('splash-drop', hidden)).toHaveLength(0);
    });

    it('should last 590 ms and then say it has finished', async () => {
      const onFinished = jest.fn();
      await renderThemed(<PressEffectLayer effect={doneEffect} onFinished={onFinished} />);

      expect(effectDuration.done).toBe(590);
      act(() => jest.advanceTimersByTime(589));
      expect(onFinished).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1));
      expect(onFinished).toHaveBeenCalledWith(doneEffect.key);
    });
  });

  describe('the Pass effect', () => {
    it('should draw a ring and six drops', async () => {
      await renderThemed(<PressEffectLayer effect={passEffect} onFinished={jest.fn()} />);

      expect(screen.getAllByTestId('splash-ring', hidden)).toHaveLength(1);
      expect(screen.getAllByTestId('splash-drop', hidden)).toHaveLength(6);
      expect(splashMotion.drops).toHaveLength(6);
    });

    it('should paint only in the muted colour, whatever the category', async () => {
      await renderThemed(<PressEffectLayer effect={passEffect} onFinished={jest.fn()} />);

      expect([...paintedColours()]).toEqual([colorThemes.light.muted.toLowerCase()]);
    });

    it('should not draw the Done star or particles', async () => {
      await renderThemed(<PressEffectLayer effect={passEffect} onFinished={jest.fn()} />);

      expect(screen.queryByTestId('burst-core', hidden)).not.toBeOnTheScreen();
      expect(screen.queryAllByTestId('burst-particle', hidden)).toHaveLength(0);
    });

    it('should last 700 ms and then say it has finished', async () => {
      const onFinished = jest.fn();
      await renderThemed(<PressEffectLayer effect={passEffect} onFinished={onFinished} />);

      expect(effectDuration.pass).toBe(700);
      act(() => jest.advanceTimersByTime(699));
      expect(onFinished).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1));
      expect(onFinished).toHaveBeenCalledWith(passEffect.key);
    });
  });

  describe('with reduce motion on', () => {
    beforeEach(() => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
    });

    it.each([doneEffect, passEffect])(
      'should draw a ring and no particles for the $kind effect',
      async (effect) => {
        await renderThemed(<PressEffectLayer effect={effect} onFinished={jest.fn()} />);

        expect(screen.getAllByTestId('reduced-motion-ring', hidden)).toHaveLength(1);
        expect(screen.queryAllByTestId('burst-core', hidden)).toHaveLength(0);
        expect(screen.queryAllByTestId('burst-particle', hidden)).toHaveLength(0);
        expect(screen.queryAllByTestId('splash-ring', hidden)).toHaveLength(0);
        expect(screen.queryAllByTestId('splash-drop', hidden)).toHaveLength(0);
      },
    );

    it('should put the ring 8 dp outside the button on every side', async () => {
      await renderThemed(<PressEffectLayer effect={doneEffect} onFinished={jest.fn()} />);

      const style = StyleSheet.flatten(
        screen.getByTestId('reduced-motion-ring', hidden).props.style,
      );
      expect(style).toMatchObject({ width: 176, height: 72 });
      expect(style.transform).toEqual([{ translateX: 12 }, { translateY: 292 }]);
    });

    it('should colour the Done ring by category and the Pass ring muted', async () => {
      const done = await renderThemed(
        <PressEffectLayer effect={doneEffect} onFinished={jest.fn()} />,
      );
      expect([...paintedColours()]).toEqual([colorThemes.light.category.c2.toLowerCase()]);
      done.unmount();

      await renderThemed(<PressEffectLayer effect={passEffect} onFinished={jest.fn()} />);
      expect([...paintedColours()]).toEqual([colorThemes.light.muted.toLowerCase()]);
    });

    // The Reanimated mock ignores this option, so the only way to see it is on the call.
    it.each([doneEffect, passEffect])(
      'should ask for the $kind fade to run even when the system setting is on',
      async (effect) => {
        const withTiming = jest.spyOn(Reanimated, 'withTiming');
        await renderThemed(<PressEffectLayer effect={effect} onFinished={jest.fn()} />);

        expect(withTiming).toHaveBeenCalledTimes(2);
        for (const [, options] of withTiming.mock.calls) {
          expect(options).toMatchObject({ reduceMotion: ReduceMotion.Never });
        }
        withTiming.mockRestore();
      },
    );

    it('should last 400 ms for Done and 480 ms for Pass', async () => {
      expect(effectDuration.reducedMotionDone).toBe(400);
      expect(effectDuration.reducedMotionPass).toBe(480);

      const onFinished = jest.fn();
      await renderThemed(<PressEffectLayer effect={passEffect} onFinished={onFinished} />);
      act(() => jest.advanceTimersByTime(479));
      expect(onFinished).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1));
      expect(onFinished).toHaveBeenCalledWith(passEffect.key);
    });
  });

  describe('for screen readers and touches', () => {
    it.each([doneEffect, passEffect])(
      'should hide the $kind effect from screen readers and let touches through',
      async (effect) => {
        await renderThemed(<PressEffectLayer effect={effect} onFinished={jest.fn()} />);

        const layer = layerOf();
        expect(isHiddenFromAccessibility(layer)).toBe(true);
        expect(layer.props.accessibilityElementsHidden).toBe(true);
        expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
        expect(layer.props.pointerEvents).toBe('none');
        expect(screen.queryByTestId('press-effect-layer')).not.toBeOnTheScreen();
      },
    );
  });

  describe('when the screen is left mid effect', () => {
    it('should drop its timer and never report', async () => {
      const onFinished = jest.fn();
      const { unmount } = await renderThemed(
        <PressEffectLayer effect={doneEffect} onFinished={onFinished} />,
      );

      act(() => jest.advanceTimersByTime(300));
      unmount();
      act(() => jest.advanceTimersByTime(1000));

      expect(onFinished).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
