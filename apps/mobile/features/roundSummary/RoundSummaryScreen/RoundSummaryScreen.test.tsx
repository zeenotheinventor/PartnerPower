import { copy, fillCopy } from '@getfreak/content';
import type { Deck, RoundAction, RoundSetup } from '@getfreak/core';
import { fireEvent, screen } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';

import { renderThemed } from '../../../tailwind/renderThemed';
import { RoundProvider, useRound, type RoundContextValue } from '../../round/RoundProvider';
import { RoundSummaryScreen } from './RoundSummaryScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    dismissTo: mockDismissTo,
    canGoBack: () => mockCanGoBack,
  }),
}));

jest.mock('../../roundSetup/randomSeed', () => ({ randomSeed: () => 99 }));

const setup: RoundSetup = {
  players: ['Player A', 'Player B'],
  level: 'l2',
  enabledCategories: ['c2'],
  length: 10,
  seed: 3,
};

const deck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [1, 2, 3, 4].map((number) => ({
    id: `card-${number}`,
    category: 'c2',
    kind: 'solo',
    text: `Card ${number}`,
    source: 'shipped',
  })),
};

// Player A does the first card, Player B passes the second and A does the third, then it ends.
const aBoldest: RoundAction[] = [
  { type: 'done' },
  { type: 'pass' },
  { type: 'done' },
  { type: 'end' },
];

// Each player does one card.
const tied: RoundAction[] = [{ type: 'done' }, { type: 'done' }, { type: 'end' }];

let latestRound: RoundContextValue | undefined;

function PlayedRound({ actions, children }: { actions: RoundAction[]; children: ReactNode }) {
  const round = useRound();
  const { startNewRound, dispatch } = round;
  // Runs after every render, so the test can read the context as it is now.
  useEffect(() => {
    latestRound = round;
  });
  useEffect(() => {
    startNewRound(setup, deck);
    actions.forEach(dispatch);
  }, [startNewRound, dispatch, actions]);
  return children;
}

async function renderSummary(actions: RoundAction[] = aBoldest) {
  await renderThemed(
    <RoundProvider>
      <PlayedRound actions={actions}>
        <RoundSummaryScreen />
      </PlayedRound>
    </RoundProvider>,
  );
}

describe('RoundSummaryScreen', () => {
  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockDismissTo.mockClear();
    mockCanGoBack = true;
    latestRound = undefined;
  });

  it('should show the title as a heading', async () => {
    await renderSummary();

    expect(screen.getByRole('header', { name: copy.roundSummary.title })).toBeOnTheScreen();
  });

  it('should show each player with the dares they did and the drinks they took', async () => {
    await renderSummary();

    expect(screen.getAllByRole('group')).toHaveLength(2);
    expect(
      screen.getByRole('group', { name: 'Player A, 2 dares done, 0 drinks, boldest' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('group', { name: 'Player B, 0 dares done, 2 drinks' }),
    ).toBeOnTheScreen();
  });

  it('should give the boldest badge and the boldest line to the player who did the most dares', async () => {
    await renderSummary();

    expect(screen.getAllByText(copy.roundSummary.boldestBadge)).toHaveLength(1);
    expect(
      screen.getByText(fillCopy(copy.roundSummary.boldestLine, { name: 'Player A' })),
    ).toBeOnTheScreen();
  });

  it('should call a tie a tie, with no badge', async () => {
    await renderSummary(tied);

    expect(screen.getByText(copy.roundSummary.tieLine)).toBeOnTheScreen();
    expect(screen.queryByText(copy.roundSummary.boldestBadge)).not.toBeOnTheScreen();
    expect(screen.queryByText(/I see you/)).not.toBeOnTheScreen();
    expect(
      screen.getByRole('group', { name: 'Player A, 1 dare done, 0 drinks' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('group', { name: 'Player B, 1 dare done, 0 drinks' }),
    ).toBeOnTheScreen();
  });

  it('should count the cards and the categories in the plural', async () => {
    await renderSummary();

    expect(screen.getByText('3 cards, 1 category, no regrets')).toBeOnTheScreen();
  });

  it('should use the singular for one card', async () => {
    await renderSummary([{ type: 'done' }, { type: 'end' }]);

    expect(screen.getByText('1 card, 1 category, no regrets')).toBeOnTheScreen();
  });

  it('should start another round with the same settings and a new seed from Play again', async () => {
    await renderSummary();

    fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));

    expect(latestRound?.lastStart?.setup).toEqual({ ...setup, seed: 99 });
    expect(latestRound?.lastStart?.deck).toBe(deck);
    expect(latestRound?.round?.history).toEqual([]);
    expect(latestRound?.round?.current).not.toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/games/dares/play');
  });

  it('should open play only once when Play again is pressed twice', async () => {
    await renderSummary();
    const playAgain = screen.getByRole('button', { name: copy.roundSummary.playAgain });

    fireEvent.press(playAgain);
    fireEvent.press(playAgain);

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('should go back to setup from Settings', async () => {
    await renderSummary();

    fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.settings }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should open setup from Settings when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderSummary();

    fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.settings }));

    expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
  });

  it('should go to the hub from Home', async () => {
    await renderSummary();

    fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.home }));

    expect(mockDismissTo).toHaveBeenCalledWith('/');
  });

  it('should not offer Play again when no round has been started', async () => {
    await renderThemed(
      <RoundProvider>
        <RoundSummaryScreen />
      </RoundProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('group')).toHaveLength(0);
  });
});
