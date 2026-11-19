import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { SecretMatchAnsweringView } from './SecretMatchAnsweringView';
import type { SecretMatchAnsweringViewProps } from './types';

const baseView: SecretMatchAnsweringViewProps['view'] = {
  phase: 'rating',
  pass: 0,
  playerName: 'Player A',
  item: { id: 'item-1', text: 'Item text one', category: 'c1' },
  position: 4,
  total: 12,
  canGoBack: true,
  ownRating: null,
};

const handlers = {
  onRate: jest.fn(),
  onBack: jest.fn(),
  onStop: jest.fn(),
};

async function renderView(overrides: Partial<SecretMatchAnsweringViewProps['view']> = {}) {
  await renderThemed(
    <SecretMatchAnsweringView
      view={{ ...baseView, ...overrides }}
      lookAwayName="Player B"
      {...handlers}
    />,
  );
}

describe('SecretMatchAnsweringView', () => {
  afterEach(() => {
    Object.values(handlers).forEach((handler) => handler.mockClear());
  });

  it('should say whose pass it is and who looks away', async () => {
    await renderView();

    expect(
      screen.getByRole('header', { name: fillCopy(copy.secretMatch.passOf, { name: 'Player A' }) }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(fillCopy(copy.secretMatch.lookAway, { name: 'Player B' })),
    ).toBeOnTheScreen();
  });

  it('should show the item with its category', async () => {
    await renderView();

    expect(screen.getByRole('group', { name: /Item text one/ })).toBeOnTheScreen();
    expect(screen.getByText(categoryNames.c1)).toBeOnTheScreen();
    expect(screen.getByText('Item text one')).toBeOnTheScreen();
  });

  it('should show where the pass is, as a count and as a progress bar named by it', async () => {
    await renderView();

    const count = fillCopy(copy.secretMatch.count, { number: 4, total: 12 });
    expect(screen.getByText(count)).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: count })).toBeOnTheScreen();
  });

  it.each(['yes', 'maybe', 'no'] as const)('should send %s from its button', async (rating) => {
    await renderView();

    fireEvent.press(screen.getByRole('button', { name: copy.secretMatch[rating] }));

    expect(handlers.onRate).toHaveBeenCalledWith(rating);
    expect(handlers.onRate).toHaveBeenCalledTimes(1);
  });

  it('should never show an answer button as chosen, even for an item rated before', async () => {
    await renderView({ ownRating: 'maybe' });

    (['yes', 'maybe', 'no'] as const).forEach((rating) => {
      expect(screen.getByRole('button', { name: copy.secretMatch[rating] })).not.toBeSelected();
    });
  });

  it('should open the stop dialog from the Stop pill', async () => {
    await renderView();

    fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.stop }));

    expect(handlers.onStop).toHaveBeenCalledTimes(1);
  });

  it('should offer to go back to the last item when there is one', async () => {
    await renderView({ canGoBack: true });

    fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.back }));

    expect(handlers.onBack).toHaveBeenCalledTimes(1);
  });

  it('should not render the back link at all on the first item', async () => {
    await renderView({ canGoBack: false, position: 1 });

    expect(screen.queryByRole('button', { name: copy.secretMatch.back })).not.toBeOnTheScreen();
  });

  it('should show nothing about an answer for an item that is not rated yet', async () => {
    await renderView({ ownRating: null });

    expect(screen.queryByText(/Your answer/)).not.toBeOnTheScreen();
  });

  it.each(['yes', 'maybe', 'no'] as const)(
    'should show the own earlier answer %s in the item card',
    async (ownRating) => {
      await renderView({ ownRating });

      expect(
        screen.getByText(
          fillCopy(copy.secretMatch.yourAnswer, { answer: copy.secretMatch[ownRating] }),
        ),
      ).toBeOnTheScreen();
    },
  );

  describe('Theo', () => {
    it.each(['c1', 'c2'] as const)(
      'should cover his eyes in %s, as decoration',
      async (category) => {
        await renderView({ item: { ...baseView.item, category } });

        expect(drawnCharacters()).toEqual([
          expect.objectContaining({
            props: expect.objectContaining({ character: 'shy', mood: 'coverEyes', crop: 'head' }),
            isHiddenFromScreenReaders: true,
          }),
        ]);
      },
    );

    it.each(['c3', 'c4'] as const)('should be flustered in %s', async (category) => {
      await renderView({ item: { ...baseView.item, category } });

      expect(drawnCharacters()[0]?.props).toEqual(expect.objectContaining({ mood: 'flustered' }));
    });
  });
});
