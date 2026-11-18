import { categoryNames, copy } from '@getfreak/content';
import type { Deck, RoundSetup } from '@getfreak/core';
import { fireEvent, screen } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';

import { renderThemed } from '../../../tailwind/renderThemed';
import { RoundProvider, useRound } from '../../round/RoundProvider';
import { RoundPlayScreen } from './RoundPlayScreen';

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

const deckWithOneCard: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [{ id: 'card-1', category: 'c2', kind: 'solo', text: 'Card 1' }],
};

const deckWithNoCards: Deck = { id: 'empty-deck', version: 1, cards: [] };

function StartRound({ deck, children }: { deck: Deck; children: ReactNode }) {
  const { startNewRound } = useRound();
  useEffect(() => startNewRound(setup, deck), [startNewRound, deck]);
  return children;
}

function renderPlay(deck?: Deck) {
  const play = <RoundPlayScreen />;
  return renderThemed(
    <RoundProvider>{deck ? <StartRound deck={deck}>{play}</StartRound> : play}</RoundProvider>,
  );
}

describe('RoundPlayScreen', () => {
  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  it('should show its title as the heading', async () => {
    await renderPlay(deckWithOneCard);

    expect(screen.getByRole('header', { name: copy.roundPlay.title })).toBeOnTheScreen();
  });

  it('should say whose turn it is and the category of the current card', async () => {
    await renderPlay(deckWithOneCard);

    expect(screen.getByText('Player A')).toBeOnTheScreen();
    expect(screen.getByText(categoryNames.c2)).toBeOnTheScreen();
    expect(screen.queryByText(copy.roundPlay.noCards)).not.toBeOnTheScreen();
  });

  it('should say the round has no cards when the deck gave none', async () => {
    await renderPlay(deckWithNoCards);

    expect(screen.getByText(copy.roundPlay.noCards)).toBeOnTheScreen();
    expect(screen.queryByText('Player A')).not.toBeOnTheScreen();
  });

  it('should say the round has no cards when no round was started', async () => {
    await renderPlay();

    expect(screen.getByText(copy.roundPlay.noCards)).toBeOnTheScreen();
  });

  it('should go back to setup from the back button', async () => {
    await renderPlay(deckWithOneCard);

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.backLabel }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should open setup when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderPlay(deckWithOneCard);

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.backLabel }));

    expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
