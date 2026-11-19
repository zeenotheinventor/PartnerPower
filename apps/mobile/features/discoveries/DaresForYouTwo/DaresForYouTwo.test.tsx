import { categoryNames, copy } from '@getfreak/content';
import type { Card } from '@getfreak/core';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { DaresForYouTwo } from './DaresForYouTwo';
import type { DaresForYouTwoProps } from './types';

const dare = (number: number, category: Card['category']): Card => ({
  id: `card-${number}`,
  category,
  kind: 'solo',
  text: `Placeholder dare ${number}`,
  source: 'shipped',
  tags: ['tag-a'],
});

const fiveDares = [dare(1, 'c1'), dare(2, 'c2'), dare(3, 'c2'), dare(4, 'c3'), dare(5, 'c4')];

const onPlay = jest.fn();
const onStartMatch = jest.fn();

async function renderSection(overrides: Partial<DaresForYouTwoProps> = {}) {
  await renderThemed(
    <DaresForYouTwo
      dares={fiveDares}
      canPlay
      onPlay={onPlay}
      onStartMatch={onStartMatch}
      {...overrides}
    />,
  );
}

describe('DaresForYouTwo', () => {
  afterEach(() => {
    onPlay.mockClear();
    onStartMatch.mockClear();
  });

  describe('with enough suggestions', () => {
    it('should show the title as a heading, with the line under it', async () => {
      await renderSection();

      expect(screen.getByRole('header', { name: copy.discoveries.daresTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.discoveries.daresBody)).toBeOnTheScreen();
    });

    it('should show each dare with its category', async () => {
      await renderSection();

      for (const { text } of fiveDares) expect(screen.getByText(text)).toBeOnTheScreen();
      expect(screen.getByText(categoryNames.c1)).toBeOnTheScreen();
      expect(screen.getAllByText(categoryNames.c2)).toHaveLength(2);
      expect(screen.getByText(categoryNames.c3)).toBeOnTheScreen();
      expect(screen.getByText(categoryNames.c4)).toBeOnTheScreen();
    });

    it('should list the dares in the order given, which is best first', async () => {
      await renderSection();

      const texts = screen.getAllByText(/^Placeholder dare /).map((node) => node.props.children);

      expect(texts).toEqual(fiveDares.map((card) => card.text));
    });

    it('should offer to play them, and play them when it is pressed', async () => {
      await renderSection();

      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.daresPlay }));

      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it('should not show the hint or the way to a secret match', async () => {
      await renderSection();

      expect(screen.queryByText(copy.discoveries.daresTooFew)).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: copy.discoveries.daresStartMatch }),
      ).not.toBeOnTheScreen();
    });
  });

  describe('with too few suggestions', () => {
    it('should show the hint to play a secret match, and no play button', async () => {
      await renderSection({ dares: [], canPlay: false });

      expect(screen.getByRole('header', { name: copy.discoveries.daresTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.discoveries.daresTooFew)).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: copy.discoveries.daresPlay }),
      ).not.toBeOnTheScreen();
    });

    it('should open a secret match from its own button', async () => {
      await renderSection({ dares: [], canPlay: false });

      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.daresStartMatch }));

      expect(onStartMatch).toHaveBeenCalledTimes(1);
    });

    it('should show no dares, even when some were given, because a round needs enough', async () => {
      await renderSection({ dares: fiveDares.slice(0, 3), canPlay: false });

      expect(screen.queryByText(fiveDares[0]?.text ?? '')).not.toBeOnTheScreen();
    });
  });
});
