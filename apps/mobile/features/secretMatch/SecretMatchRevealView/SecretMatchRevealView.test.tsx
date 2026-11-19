import { categoryNames, copy, fillCopy } from '@getfreak/content';
import type { SecretMatch } from '@getfreak/core';
import { fireEvent, screen, within } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { SecretMatchRevealView } from './SecretMatchRevealView';
import type { SecretMatchRevealViewProps } from './types';

const matches: SecretMatch[] = [
  { item: { id: 'item-1', text: 'Item text one', category: 'c1' }, strength: 'yes' },
  { item: { id: 'item-2', text: 'Item text two', category: 'c2' }, strength: 'maybe' },
  { item: { id: 'item-3', text: 'Item text three', category: 'c3' }, strength: 'yes' },
];

const onDone = jest.fn();
const onOpenDares = jest.fn();

async function renderView(overrides: Partial<SecretMatchRevealViewProps> = {}) {
  await renderThemed(
    <SecretMatchRevealView
      matches={matches}
      total={12}
      savedLine="saved"
      onDone={onDone}
      onOpenDares={onOpenDares}
      {...overrides}
    />,
  );
}

describe('SecretMatchRevealView', () => {
  afterEach(() => {
    onDone.mockClear();
    onOpenDares.mockClear();
  });

  describe('with matches', () => {
    it('should say how many matches there are out of how many items', async () => {
      await renderView();

      expect(screen.getByRole('header', { name: copy.secretMatch.revealTitle })).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.secretMatch.revealCountMany, { count: 3, total: 12 })),
      ).toBeOnTheScreen();
    });

    it('should say one match in the singular', async () => {
      await renderView({ matches: matches.slice(0, 1) });

      expect(
        screen.getByText(fillCopy(copy.secretMatch.revealCountOne, { total: 12 })),
      ).toBeOnTheScreen();
    });

    it('should list the matches in the order it is given them, each with its category and strength line', async () => {
      await renderView();

      const cards = screen.getAllByRole('group');
      expect(cards).toHaveLength(3);
      const expected = [
        [categoryNames.c1, 'Item text one', copy.secretMatch.strengthYes],
        [categoryNames.c2, 'Item text two', copy.secretMatch.strengthMaybe],
        [categoryNames.c3, 'Item text three', copy.secretMatch.strengthYes],
      ];
      cards.forEach((card, index) => {
        expected[index]?.forEach((line) => expect(within(card).getByText(line)).toBeOnTheScreen());
      });
    });

    it('should never say who said maybe', async () => {
      await renderView();

      expect(screen.queryByText(/Player/)).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.secretMatch.maybe)).not.toBeOnTheScreen();
    });

    it('should show Theo happy beside his line, as decoration', async () => {
      await renderView();

      expect(screen.getByText(copy.secretMatch.revealTheo)).toBeOnTheScreen();
      expect(drawnCharacters()).toEqual([
        expect.objectContaining({
          props: expect.objectContaining({ character: 'shy', mood: 'happy', crop: 'head' }),
          isHiddenFromScreenReaders: true,
        }),
      ]);
    });

    it('should say the matches are saved when they are', async () => {
      await renderView({ savedLine: 'saved' });

      expect(screen.getByText(copy.secretMatch.saved)).toBeOnTheScreen();
      expect(screen.queryByText(copy.secretMatch.savingOff)).not.toBeOnTheScreen();
    });

    it('should say that matches go when they leave if saving is off', async () => {
      await renderView({ savedLine: 'savingOff' });

      expect(screen.getByText(copy.secretMatch.savingOff)).toBeOnTheScreen();
      expect(screen.queryByText(copy.secretMatch.saved)).not.toBeOnTheScreen();
    });

    it('should say nothing about saving before it is known, or when it failed', async () => {
      await renderView({ savedLine: null });

      expect(screen.queryByText(copy.secretMatch.saved)).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.secretMatch.savingOff)).not.toBeOnTheScreen();
    });

    it('should open the dares for you two link when there is somewhere for it to go', async () => {
      await renderView();

      fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.daresTitle }));

      expect(onOpenDares).toHaveBeenCalledTimes(1);
      expect(screen.getByText(copy.secretMatch.daresBody)).toBeOnTheScreen();
    });

    it('should hide the link when there is nowhere for it to go', async () => {
      await renderView({ onOpenDares: undefined });

      expect(
        screen.queryByRole('button', { name: copy.secretMatch.daresTitle }),
      ).not.toBeOnTheScreen();
    });

    it('should finish with Done', async () => {
      await renderView();

      fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.done }));

      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('with no matches', () => {
    it('should show the gentle empty state, with Theo flustered', async () => {
      await renderView({ matches: [] });

      expect(screen.getByRole('header', { name: copy.secretMatch.noneTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.secretMatch.noneBody)).toBeOnTheScreen();
      expect(screen.getByText(copy.secretMatch.noneTheo)).toBeOnTheScreen();
      expect(drawnCharacters()).toEqual([
        expect.objectContaining({
          props: expect.objectContaining({ character: 'shy', mood: 'flustered' }),
          isHiddenFromScreenReaders: true,
        }),
      ]);
    });

    it('should show no list, no count, no link and no saved line', async () => {
      await renderView({ matches: [] });

      expect(screen.queryByRole('group')).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('header', { name: copy.secretMatch.revealTitle }),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: copy.secretMatch.daresTitle }),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.secretMatch.saved)).not.toBeOnTheScreen();
    });

    it('should finish with Done', async () => {
      await renderView({ matches: [] });

      fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.done }));

      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });
});
