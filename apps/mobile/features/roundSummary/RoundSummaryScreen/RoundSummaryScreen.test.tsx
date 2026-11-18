import { copy, fillCopy } from '@getfreak/content';
import type { Deck, RoundAction, RoundSetup } from '@getfreak/core';
import { fireEvent, screen, within } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';

import { renderThemed } from '../../../tailwind/renderThemed';
import { RoundProvider, useRound } from '../../round/RoundProvider';
import { RoundSummaryScreen } from './RoundSummaryScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));

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
  })),
};

// Player A does the first card, Player B passes the second and A does the third, then it ends.
const actions: RoundAction[] = [
  { type: 'done' },
  { type: 'pass' },
  { type: 'done' },
  { type: 'end' },
];

function PlayedRound({ children }: { children: ReactNode }) {
  const { startNewRound, dispatch } = useRound();
  useEffect(() => {
    startNewRound(setup, deck);
    actions.forEach(dispatch);
  }, [startNewRound, dispatch]);
  return children;
}

function expectPlayerCard(
  card: ReturnType<typeof screen.getByRole> | undefined,
  name: string,
  daresDone: number,
  drinks: number,
) {
  if (!card) throw new Error('The summary has too few player cards');
  const inCard = within(card);
  expect(inCard.getByText(name)).toBeOnTheScreen();
  expect(
    inCard.getByText(fillCopy(copy.roundSummary.daresDone, { count: daresDone })),
  ).toBeOnTheScreen();
  expect(inCard.getByText(fillCopy(copy.roundSummary.drinks, { count: drinks }))).toBeOnTheScreen();
}

describe('RoundSummaryScreen', () => {
  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  it('should show each player with the dares they did and the drinks they took', async () => {
    await renderThemed(
      <RoundProvider>
        <PlayedRound>
          <RoundSummaryScreen />
        </PlayedRound>
      </RoundProvider>,
    );

    expect(screen.getByRole('header', { name: copy.roundSummary.title })).toBeOnTheScreen();
    const [firstCard, secondCard] = screen.getAllByRole('group');
    expect(screen.getAllByRole('group')).toHaveLength(2);
    expectPlayerCard(firstCard, 'Player A', 2, 0);
    expectPlayerCard(secondCard, 'Player B', 0, 2);
  });

  it('should go back to setup from the button', async () => {
    await renderThemed(
      <RoundProvider>
        <RoundSummaryScreen />
      </RoundProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.backToSetup }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should open setup when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderThemed(
      <RoundProvider>
        <RoundSummaryScreen />
      </RoundProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.backToSetup }));

    expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
  });
});
