import { categoryNames, copy, fillCopy } from '@getfreak/content';
import {
  reduceRound,
  startRound,
  type Card,
  type CategoryId,
  type CurrentCard,
  type Deck,
  type RoundSetup,
} from '@getfreak/core';
import { act, fireEvent, screen, within } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';

import { renderThemed } from '../../../tailwind/renderThemed';
import { RoundProvider, useRound } from '../../round/RoundProvider';
import { RoundPlayScreen } from './RoundPlayScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockPreventsRemove = false;
let mockOnRemovePrevented: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (preventRemove: boolean, callback: () => void) => {
    mockPreventsRemove = preventRemove;
    mockOnRemovePrevented = callback;
  },
}));

const summaryRoute = '/games/dares/summary';
const setupRoute = '/games/dares/setup';

function makeCards(category: CategoryId): Card[] {
  const solos: Card[] = [1, 2, 3, 4, 5, 6].map((number) => ({
    id: `${category}-solo-${number}`,
    category,
    kind: 'solo',
    text: `Card ${category} solo ${number}`,
  }));
  const together: Card = {
    id: `${category}-together`,
    category,
    kind: 'together',
    text: `Card ${category} together`,
  };
  return [...solos, together];
}

const deck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [...makeCards('c1'), ...makeCards('c2'), ...makeCards('c3')],
};

const deckWithNoCards: Deck = { id: 'empty-deck', version: 1, cards: [] };

// Ten cards over c1 and c2 gives five of each. Card 5 and card 10 are together cards.
const twoCategories: RoundSetup = {
  players: ['Player A', 'Player B'],
  level: 'l3',
  enabledCategories: ['c1', 'c2'],
  length: 10,
  seed: 7,
};

// Ten cards over three categories gives 3, 3 and 4. Card 4 steps up with the other player.
const threeCategories: RoundSetup = { ...twoCategories, enabledCategories: ['c1', 'c2', 'c3'] };

const middleCategoryOnly: RoundSetup = { ...twoCategories, enabledCategories: ['c2'] };
const twentyCards: RoundSetup = { ...twoCategories, length: 20 };
const endless: RoundSetup = { ...twoCategories, length: 'endless' };

/** The cards a round deals when every card is done, which is the order the screen shows them. */
function dealtCards(setup: RoundSetup): CurrentCard[] {
  const dealt: CurrentCard[] = [];
  let state = startRound(setup, deck);
  while (state.current) {
    dealt.push(state.current);
    state = reduceRound(state, { type: 'done' });
  }
  return dealt;
}

function textOfCard(setup: RoundSetup, number: number) {
  const dealt = dealtCards(setup)[number - 1];
  if (!dealt) throw new Error(`The round has no card ${number}`);
  return dealt.card.text;
}

function StartRound({
  round,
  roundDeck,
  children,
}: {
  round: RoundSetup;
  roundDeck: Deck;
  children: ReactNode;
}) {
  const { startNewRound } = useRound();
  useEffect(() => startNewRound(round, roundDeck), [startNewRound, round, roundDeck]);
  return children;
}

async function renderPlay(round?: RoundSetup, roundDeck: Deck = deck) {
  const play = <RoundPlayScreen />;
  return renderThemed(
    <RoundProvider>
      {round ? (
        <StartRound round={round} roundDeck={roundDeck}>
          {play}
        </StartRound>
      ) : (
        play
      )}
    </RoundProvider>,
  );
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

const handoffTitle = (name: string) => fillCopy(copy.roundPlay.handoffTitle, { name });
const handoffLine = (name: string) => fillCopy(copy.roundPlay.handoffLine, { name });
const turnOf = (name: string) => fillCopy(copy.roundPlay.turnOf, { name });
const cardCount = (number: number, length: number) =>
  fillCopy(copy.roundPlay.cardCount, { number, length });

/** Gets past the Pass the phone screen to the card. */
function takeThePhone() {
  press(copy.roundPlay.handoffButton);
}

/** Plays the cards before this one, gets past the screens in between, and stops at the card. */
function playUntilCard(number: number) {
  for (let played = 1; played < number; played += 1) {
    if (screen.queryByRole('button', { name: copy.roundPlay.handoffButton })) takeThePhone();
    if (screen.queryByRole('button', { name: copy.roundPlay.stepUpButton })) {
      press(copy.roundPlay.stepUpButton);
      if (screen.queryByRole('button', { name: copy.roundPlay.handoffButton })) takeThePhone();
    }
    press(copy.roundPlay.done);
  }
  if (screen.queryByRole('button', { name: copy.roundPlay.stepUpButton })) {
    press(copy.roundPlay.stepUpButton);
  }
  if (screen.queryByRole('button', { name: copy.roundPlay.handoffButton })) takeThePhone();
}

describe('RoundPlayScreen', () => {
  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
    mockPreventsRemove = false;
    mockOnRemovePrevented = undefined;
  });

  describe('the first card', () => {
    it('should ask for the phone to go to the first player before showing the card', async () => {
      await renderPlay(twoCategories);

      expect(screen.getByRole('header', { name: handoffTitle('Player A') })).toBeOnTheScreen();
      expect(screen.queryByText(textOfCard(twoCategories, 1))).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.roundPlay.done })).not.toBeOnTheScreen();
    });

    it('should not tell anyone to look away, because nobody held the phone before', async () => {
      await renderPlay(twoCategories);

      expect(screen.queryByText(/Eyes off the screen/)).not.toBeOnTheScreen();
    });

    it('should show the card once the phone has been taken', async () => {
      await renderPlay(twoCategories);

      takeThePhone();

      expect(screen.getByText(turnOf('Player A'))).toBeOnTheScreen();
      expect(screen.getByText(textOfCard(twoCategories, 1))).toBeOnTheScreen();
      expect(screen.getByText(categoryNames.c1)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.roundPlay.done })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.roundPlay.pass })).toBeOnTheScreen();
      expect(
        screen.queryByRole('header', { name: handoffTitle('Player A') }),
      ).not.toBeOnTheScreen();
    });

    it('should show the penalty for passing the category of the card', async () => {
      await renderPlay(middleCategoryOnly);

      takeThePhone();

      expect(screen.getByText(fillCopy(copy.roundPlay.penalty, { penalty: 2 }))).toBeOnTheScreen();
      expect(screen.getByText(categoryNames.c2)).toBeOnTheScreen();
    });
  });

  describe('moving to the next turn', () => {
    it('should pass the phone to the other player after Done', async () => {
      await renderPlay(twoCategories);
      takeThePhone();

      press(copy.roundPlay.done);

      expect(screen.getByRole('header', { name: handoffTitle('Player B') })).toBeOnTheScreen();
      expect(screen.getByText(handoffLine('Player A'))).toBeOnTheScreen();
      expect(screen.queryByText(textOfCard(twoCategories, 2))).not.toBeOnTheScreen();
    });

    it('should pass the phone to the other player after Pass', async () => {
      await renderPlay(twoCategories);
      takeThePhone();

      press(copy.roundPlay.pass);

      expect(screen.getByRole('header', { name: handoffTitle('Player B') })).toBeOnTheScreen();
      expect(screen.getByText(handoffLine('Player A'))).toBeOnTheScreen();
    });

    it('should show the next card for the other player once they have the phone', async () => {
      await renderPlay(twoCategories);
      takeThePhone();
      press(copy.roundPlay.done);

      takeThePhone();

      expect(screen.getByText(turnOf('Player B'))).toBeOnTheScreen();
      expect(screen.getByText(textOfCard(twoCategories, 2))).toBeOnTheScreen();
      expect(screen.getByText(cardCount(2, 10))).toBeOnTheScreen();
    });

    it('should not ask for the phone when the same player holds it for the next card', async () => {
      // Card 5 is a together card held by Player A, and card 6 is Player A's turn again.
      await renderPlay(twoCategories);
      playUntilCard(5);

      press(copy.roundPlay.done);
      press(copy.roundPlay.stepUpButton);

      expect(screen.queryByRole('header', { name: /Pass the phone/ })).not.toBeOnTheScreen();
      expect(screen.getByText(turnOf('Player A'))).toBeOnTheScreen();
    });
  });

  describe('stepping up a category', () => {
    it('should announce the new category and the new cost before the card', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      press(copy.roundPlay.done);

      expect(screen.getByRole('header', { name: copy.roundPlay.stepUpTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.roundPlay.stepUpLine)).toBeOnTheScreen();
      expect(screen.getByText(categoryNames.c2)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.roundPlay.stepUpCost, { penalty: 2 })),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.roundPlay.done })).not.toBeOnTheScreen();
    });

    it('should show the card straight after Bring it when the same player holds the phone', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);
      press(copy.roundPlay.done);

      press(copy.roundPlay.stepUpButton);

      expect(screen.getByText(textOfCard(twoCategories, 6))).toBeOnTheScreen();
      expect(screen.getByText(turnOf('Player A'))).toBeOnTheScreen();
    });

    it('should ask for the phone after Bring it when the other player holds it', async () => {
      await renderPlay(threeCategories);
      playUntilCard(3);
      press(copy.roundPlay.done);

      expect(screen.getByRole('header', { name: copy.roundPlay.stepUpTitle })).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.roundPlay.stepUpCost, { penalty: 2 })),
      ).toBeOnTheScreen();

      press(copy.roundPlay.stepUpButton);

      expect(screen.getByRole('header', { name: handoffTitle('Player B') })).toBeOnTheScreen();
      takeThePhone();
      expect(screen.getByText(textOfCard(threeCategories, 4))).toBeOnTheScreen();
      expect(screen.getByText(turnOf('Player B'))).toBeOnTheScreen();
    });
  });

  describe('progress through the round', () => {
    it('should show the card number out of ten as a progress bar and as text', async () => {
      await renderPlay(twoCategories);
      takeThePhone();

      expect(screen.getByText(cardCount(1, 10))).toBeOnTheScreen();
      const bar = screen.getByRole('progressbar', { name: cardCount(1, 10) });
      expect(bar).toHaveAccessibilityValue({ min: 0, max: 10, now: 1 });
    });

    it('should show the card number out of twenty', async () => {
      await renderPlay(twentyCards);
      takeThePhone();
      press(copy.roundPlay.done);
      takeThePhone();

      const bar = screen.getByRole('progressbar', { name: cardCount(2, 20) });
      expect(bar).toHaveAccessibilityValue({ min: 0, max: 20, now: 2 });
    });

    it('should show only the card number, with no progress bar, in an endless round', async () => {
      await renderPlay(endless);
      takeThePhone();

      expect(
        screen.getByText(fillCopy(copy.roundPlay.cardCountEndless, { number: 1 })),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    });
  });

  describe('a together card', () => {
    it('should say both players, and that both drink for passing', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      expect(screen.getByText(copy.roundPlay.bothOfYou)).toBeOnTheScreen();
      expect(screen.getByText(textOfCard(twoCategories, 5))).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.roundPlay.penaltyTogether, { penalty: 1 })),
      ).toBeOnTheScreen();
      expect(screen.queryByText(turnOf('Player A'))).not.toBeOnTheScreen();
    });

    it('should move on after Done and after Pass like any other card', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      press(copy.roundPlay.pass);

      expect(screen.getByRole('header', { name: copy.roundPlay.stepUpTitle })).toBeOnTheScreen();
    });
  });

  describe('ending the round', () => {
    it('should open the summary when the last card is done', async () => {
      await renderPlay(twoCategories);
      playUntilCard(10);

      press(copy.roundPlay.done);

      expect(mockReplace).toHaveBeenCalledWith(summaryRoute);
    });

    it('should open the summary when the last card is passed', async () => {
      await renderPlay(twoCategories);
      playUntilCard(10);

      press(copy.roundPlay.pass);

      expect(mockReplace).toHaveBeenCalledWith(summaryRoute);
    });

    it('should not open the summary while cards are left', async () => {
      await renderPlay(twoCategories);
      playUntilCard(9);

      press(copy.roundPlay.done);

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should ask before ending the round early', async () => {
      await renderPlay(twoCategories);
      takeThePhone();

      press(copy.roundPlay.endRound);

      expect(screen.getByRole('header', { name: copy.roundPlay.endDialogTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.roundPlay.endDialogBody)).toBeOnTheScreen();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should keep playing when the player chooses Keep playing', async () => {
      await renderPlay(twoCategories);
      takeThePhone();
      press(copy.roundPlay.endRound);

      press(copy.roundPlay.endDialogCancel);

      expect(
        screen.queryByRole('header', { name: copy.roundPlay.endDialogTitle }),
      ).not.toBeOnTheScreen();
      expect(screen.getByText(textOfCard(twoCategories, 1))).toBeOnTheScreen();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should open the summary when the player confirms ending the round', async () => {
      await renderPlay(twoCategories);
      takeThePhone();
      press(copy.roundPlay.endRound);

      const dialog = screen.getByLabelText(copy.roundPlay.endDialogTitle);
      const confirmButton = within(dialog).getByRole('button', {
        name: copy.roundPlay.endDialogConfirm,
      });
      fireEvent.press(confirmButton);

      expect(mockReplace).toHaveBeenCalledWith(summaryRoute);
    });

    it('should stop the player leaving, and open the dialog, when they go back', async () => {
      await renderPlay(twoCategories);
      takeThePhone();

      expect(mockPreventsRemove).toBe(true);
      act(() => mockOnRemovePrevented?.());

      expect(screen.getByRole('header', { name: copy.roundPlay.endDialogTitle })).toBeOnTheScreen();
    });

    it('should stop preventing going back once the round is over', async () => {
      await renderPlay(twoCategories);
      playUntilCard(10);

      press(copy.roundPlay.done);

      expect(mockPreventsRemove).toBe(false);
    });

    it('should stop preventing going back after the player confirms ending the round', async () => {
      await renderPlay(twoCategories);
      takeThePhone();
      press(copy.roundPlay.endRound);
      const dialog = screen.getByLabelText(copy.roundPlay.endDialogTitle);

      fireEvent.press(
        within(dialog).getByRole('button', { name: copy.roundPlay.endDialogConfirm }),
      );

      expect(mockPreventsRemove).toBe(false);
    });

    it('should open the dialog when the player goes back from the Pass the phone screen', async () => {
      await renderPlay(twoCategories);

      expect(mockPreventsRemove).toBe(true);
      act(() => mockOnRemovePrevented?.());

      expect(screen.getByRole('header', { name: copy.roundPlay.endDialogTitle })).toBeOnTheScreen();
    });
  });

  describe('a round with no cards', () => {
    it('should say so, with a way back to setup', async () => {
      await renderPlay(twoCategories, deckWithNoCards);

      expect(screen.getByText(copy.roundPlay.noCards)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.roundPlay.done })).not.toBeOnTheScreen();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should say so when no round was started', async () => {
      await renderPlay();

      expect(screen.getByText(copy.roundPlay.noCards)).toBeOnTheScreen();
    });

    it('should go back to setup from the back button', async () => {
      await renderPlay(twoCategories, deckWithNoCards);

      press(copy.roundPlay.backLabel);

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should open setup when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderPlay();

      press(copy.roundPlay.backLabel);

      expect(mockReplace).toHaveBeenCalledWith(setupRoute);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should not stop the player leaving', async () => {
      await renderPlay(twoCategories, deckWithNoCards);

      expect(mockPreventsRemove).toBe(false);
    });
  });
});
