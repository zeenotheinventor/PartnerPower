import { categoryNames, copy, fillCopy } from '@getfreak/content';
import {
  reduceRound,
  startRound,
  type Card,
  type CategoryId,
  type CurrentCard,
  type Deck,
  type RoundSetup,
  type RoundState,
  summarise,
} from '@getfreak/core';
import { colorThemes } from '@getfreak/tokens';
import { act, fireEvent, screen, within } from 'nativewind/test';
import { StyleSheet } from 'react-native';
import { useEffect, type ReactNode } from 'react';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
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
    source: 'shipped',
  }));
  const together: Card = {
    id: `${category}-together`,
    category,
    kind: 'together',
    text: `Card ${category} together`,
    source: 'shipped',
  };
  return [...solos, together];
}

const deck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [...makeCards('c1'), ...makeCards('c2'), ...makeCards('c3')],
};

const deckWithNoCards: Deck = { id: 'empty-deck', version: 1, cards: [] };

// The middle category has two cards for one player and a together card, so a skip on card 6 finds
// no card left in it and draws from the category above.
const deckWithThinMiddle: Deck = {
  id: 'thin-middle-deck',
  version: 1,
  cards: [
    ...makeCards('c1'),
    ...makeCards('c2').filter(({ id }) => ['c2-solo-1', 'c2-solo-2', 'c2-together'].includes(id)),
    ...makeCards('c3'),
  ],
};

const deckWithOneCard: Deck = {
  id: 'one-card-deck',
  version: 1,
  cards: [{ id: 'only-card', category: 'c1', kind: 'solo', text: 'Only card', source: 'shipped' }],
};

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
  const play = (
    <>
      <RoundProbe />
      <RoundPlayScreen />
    </>
  );
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

// The latest round the provider holds, so a test can read what the buttons did to it.
const latest: { round?: RoundState } = {};
function RoundProbe() {
  const { round } = useRound();
  useEffect(() => {
    latest.round = round;
  }, [round]);
  return null;
}

/** The background colours of the views around an element, which include the card's edge. */
function backgroundsAround(element: ReturnType<typeof screen.getByText>): string[] {
  const backgrounds: string[] = [];
  for (let node = element.parent; node; node = node.parent) {
    const background = StyleSheet.flatten(node.props.style)?.backgroundColor;
    if (typeof background === 'string') backgrounds.push(background);
  }
  return backgrounds;
}

function roundNow(): RoundState {
  if (!latest.round) throw new Error('No round has been started');
  return latest.round;
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

const handoffTitle = (name: string) => fillCopy(copy.roundPlay.handoffTitle, { name });
const handoffLine = (name: string) => fillCopy(copy.roundPlay.handoffLine, { name });
const turnOf = (name: string) => fillCopy(copy.roundPlay.turnOf, { name });
const cardCount = (number: number, length: number) =>
  fillCopy(copy.roundPlay.cardCount, { number, length });

// A together card words its two buttons differently, so these press whichever pair is showing.
function pressDone() {
  const togetherDone = screen.queryByRole('button', { name: copy.roundPlay.togetherDone });
  press(togetherDone ? copy.roundPlay.togetherDone : copy.roundPlay.done);
}

function pressPass() {
  const togetherPass = screen.queryByRole('button', { name: copy.roundPlay.togetherPass });
  press(togetherPass ? copy.roundPlay.togetherPass : copy.roundPlay.pass);
}

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
    pressDone();
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
    latest.round = undefined;
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

    it('should have Mei peek over the card, hidden from screen readers', async () => {
      await renderPlay(twoCategories);

      takeThePhone();

      expect(drawnCharacters()).toEqual([
        {
          props: { character: 'dealer', mood: 'flirty', size: 'tile', crop: 'head' },
          isHiddenFromScreenReaders: true,
        },
      ]);
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

      pressDone();
      press(copy.roundPlay.stepUpButton);

      expect(screen.queryByRole('header', { name: /Pass the phone/ })).not.toBeOnTheScreen();
      expect(screen.getByText(turnOf('Player A'))).toBeOnTheScreen();
    });
  });

  describe('stepping up a category', () => {
    it('should announce the new category and the new cost before the card', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      pressDone();

      expect(screen.getByRole('header', { name: copy.roundPlay.stepUpTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.roundPlay.stepUpLine)).toBeOnTheScreen();
      expect(screen.getByText(categoryNames.c2)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.roundPlay.stepUpCost, { penalty: 2 })),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.roundPlay.done })).not.toBeOnTheScreen();
    });

    it('should have Nyx say the line, hidden from screen readers', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      pressDone();

      expect(drawnCharacters()).toEqual([
        {
          props: { character: 'gatekeeper', mood: 'flirty', size: 'hero' },
          isHiddenFromScreenReaders: true,
        },
      ]);
    });

    it('should show the card straight after Bring it when the same player holds the phone', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);
      pressDone();

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
    const togetherPenaltyLine = fillCopy(copy.roundPlay.penaltyTogether, { penalty: 1 });
    const bothNames = fillCopy(copy.roundPlay.togetherNames, {
      first: 'Player A',
      second: 'Player B',
    });

    it('should say both players, and that both drink for passing', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      expect(screen.getByText(copy.roundPlay.bothOfYou)).toBeOnTheScreen();
      expect(screen.getByText(textOfCard(twoCategories, 5))).toBeOnTheScreen();
      expect(screen.getByText(togetherPenaltyLine)).toBeOnTheScreen();
      expect(screen.queryByText(turnOf('Player A'))).not.toBeOnTheScreen();
    });

    it('should be marked as a together card and name both players', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      expect(screen.getByRole('text', { name: copy.roundPlay.togetherChip })).toBeOnTheScreen();
      expect(screen.getByText(bothNames)).toBeOnTheScreen();
      expect(screen.getByText(categoryNames.c1)).toBeOnTheScreen();
    });

    it('should offer We did it and We drink in place of Done and Pass', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      expect(screen.getByRole('button', { name: copy.roundPlay.togetherDone })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.roundPlay.togetherPass })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.roundPlay.done })).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.roundPlay.pass })).not.toBeOnTheScreen();
    });

    it('should count a dare done for both players after We did it', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);
      const before = latest.round && summarise(latest.round).players;

      press(copy.roundPlay.togetherDone);

      const after = latest.round && summarise(latest.round).players;
      expect(after?.map((player) => player.daresDone)).toEqual(
        before?.map((player) => player.daresDone + 1),
      );
      expect(after?.map((player) => player.drinks)).toEqual(before?.map((player) => player.drinks));
    });

    it('should charge both players the drink penalty after We drink', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);
      const before = latest.round && summarise(latest.round).players;

      press(copy.roundPlay.togetherPass);

      const after = latest.round && summarise(latest.round).players;
      expect(after?.map((player) => player.drinks)).toEqual(
        before?.map((player) => player.drinks + 1),
      );
      expect(after?.map((player) => player.daresDone)).toEqual(
        before?.map((player) => player.daresDone),
      );
    });

    it('should move on after We did it and after We drink', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      press(copy.roundPlay.togetherPass);

      expect(screen.getByRole('header', { name: copy.roundPlay.stepUpTitle })).toBeOnTheScreen();
    });

    it('should carry on with the turn order from where it was, with no phone to pass', async () => {
      // Card 4 was Player B's, card 5 is for both, so card 6 is Player A's, who holds the phone.
      await renderPlay(twoCategories);
      playUntilCard(5);

      press(copy.roundPlay.togetherPass);
      press(copy.roundPlay.stepUpButton);

      expect(screen.queryByRole('header', { name: /Pass the phone/ })).not.toBeOnTheScreen();
      expect(screen.getByText(turnOf('Player A'))).toBeOnTheScreen();
      expect(screen.getByText(textOfCard(twoCategories, 6))).toBeOnTheScreen();
    });

    it('should edge the card in the deep accent colour', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      const edges = backgroundsAround(screen.getByText(textOfCard(twoCategories, 5)));

      expect(edges).toContain(colorThemes.light.accentDeep.toLowerCase());
    });

    it('should edge a card for one player in its category colour, not the accent', async () => {
      await renderPlay(twoCategories);
      takeThePhone();

      const edges = backgroundsAround(screen.getByText(textOfCard(twoCategories, 1)));

      expect(edges).toContain(colorThemes.light.category.c1.toLowerCase());
      expect(edges).not.toContain(colorThemes.light.accentDeep.toLowerCase());
    });

    it('should show none of the together parts on a card for one player', async () => {
      await renderPlay(twoCategories);
      takeThePhone();

      expect(
        screen.queryByRole('text', { name: copy.roundPlay.togetherChip }),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText(bothNames)).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: copy.roundPlay.togetherDone }),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: copy.roundPlay.togetherPass }),
      ).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.roundPlay.done })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.roundPlay.pass })).toBeOnTheScreen();
      expect(screen.queryByText(copy.roundPlay.bothOfYou)).not.toBeOnTheScreen();
    });
  });

  describe('ending the round', () => {
    it('should open the summary when the last card is done', async () => {
      await renderPlay(twoCategories);
      playUntilCard(10);

      pressDone();

      expect(mockReplace).toHaveBeenCalledWith(summaryRoute);
    });

    it('should open the summary when the last card is passed', async () => {
      await renderPlay(twoCategories);
      playUntilCard(10);

      pressPass();

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

      pressDone();

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

  describe('Not this one', () => {
    const notThisOneName = copy.roundPlay.notThisOne;
    const sheetTitle = copy.roundPlay.sheetTitle;
    const openSheet = () => press(notThisOneName);
    const isSheetOpen = () => screen.queryByText(sheetTitle) !== null;
    const isDialogOpen = () => screen.queryByText(copy.roundPlay.endDialogTitle) !== null;

    it('should show the quiet control under the buttons on a card for one player', async () => {
      await renderPlay(twoCategories);
      takeThePhone();

      expect(screen.getByRole('button', { name: notThisOneName })).toBeOnTheScreen();
    });

    it('should show it on a together card too', async () => {
      await renderPlay(twoCategories);
      playUntilCard(5);

      expect(screen.getByText(copy.roundPlay.bothOfYou)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: notThisOneName })).toBeOnTheScreen();
    });

    it('should not show it on the Pass the phone screen', async () => {
      await renderPlay(twoCategories);

      expect(screen.queryByRole('button', { name: notThisOneName })).not.toBeOnTheScreen();
    });

    it('should not show the sheet until the control is pressed', async () => {
      await renderPlay(twoCategories);
      takeThePhone();

      expect(isSheetOpen()).toBe(false);
    });

    it('should open the sheet with the option to skip and a switch for each category in the round', async () => {
      await renderPlay(threeCategories);
      takeThePhone();

      openSheet();

      expect(screen.getByRole('header', { name: sheetTitle })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.roundPlay.skipTitle })).toBeOnTheScreen();
      expect(screen.getAllByRole('switch')).toHaveLength(3);
      expect(
        screen.getByRole('switch', { name: categoryNames.c3, checked: true }),
      ).toBeOnTheScreen();
    });

    describe('skipping the card', () => {
      it('should draw a new card for the same player, with no phone to pass, and close the sheet', async () => {
        await renderPlay(twoCategories);
        takeThePhone();
        const skippedText = textOfCard(twoCategories, 1);
        openSheet();

        press(copy.roundPlay.skipTitle);

        expect(isSheetOpen()).toBe(false);
        expect(screen.queryByText(skippedText)).not.toBeOnTheScreen();
        expect(latest.round?.current?.card.text).toBeDefined();
        expect(screen.getByText(latest.round?.current?.card.text ?? '')).toBeOnTheScreen();
        expect(screen.getByText(turnOf('Player A'))).toBeOnTheScreen();
        expect(screen.queryByRole('button', { name: copy.roundPlay.handoffButton })).toBeNull();
      });

      it('should not use up a card of the round, or cost anyone a drink or a dare', async () => {
        await renderPlay(twoCategories);
        takeThePhone();
        openSheet();

        press(copy.roundPlay.skipTitle);

        expect(screen.getByText(cardCount(1, 10))).toBeOnTheScreen();
        expect(latest.round?.history).toHaveLength(0);
        expect(summarise(roundNow()).players).toEqual([
          { name: 'Player A', daresDone: 0, drinks: 0 },
          { name: 'Player B', daresDone: 0, drinks: 0 },
        ]);
        expect(mockReplace).not.toHaveBeenCalled();
      });

      it('should never bring the skipped card back for the rest of the round', async () => {
        await renderPlay(twoCategories);
        takeThePhone();
        const skippedId = latest.round?.current?.card.id;
        openSheet();
        press(copy.roundPlay.skipTitle);

        playUntilCard(10);
        pressDone();

        expect(mockReplace).toHaveBeenCalledWith(summaryRoute);
        expect(latest.round?.history).toHaveLength(10);
        expect(latest.round?.history.map(({ cardId }) => cardId)).not.toContain(skippedId);
      });

      it('should not step up to a replacement in a higher category, because the cost is on the card', async () => {
        await renderPlay(threeCategories, deckWithThinMiddle);
        playUntilCard(6);
        openSheet();

        press(copy.roundPlay.skipTitle);

        expect(roundNow().current?.card.category).toBe('c3');
        expect(roundNow().current?.steppingUp).toBe(true);
        expect(screen.queryByRole('button', { name: copy.roundPlay.stepUpButton })).toBeNull();
        expect(screen.getByRole('button', { name: copy.roundPlay.done })).toBeOnTheScreen();
      });

      it('should skip a together card for another together card, with nobody drinking', async () => {
        await renderPlay(twoCategories);
        playUntilCard(5);
        openSheet();

        press(copy.roundPlay.skipTitle);

        expect(latest.round?.current?.card.kind).toBe('together');
        expect(latest.round?.history.filter(({ outcome }) => outcome === 'passed')).toHaveLength(0);
      });

      it('should show the summary when no card is left to draw', async () => {
        await renderPlay({ ...twoCategories, enabledCategories: ['c1'] }, deckWithOneCard);
        takeThePhone();
        openSheet();

        press(copy.roundPlay.skipTitle);

        expect(mockReplace).toHaveBeenCalledWith(summaryRoute);
      });
    });

    describe('switching a category off', () => {
      it('should take its cards out for the rest of the round, and show it as off', async () => {
        await renderPlay(threeCategories);
        takeThePhone();
        openSheet();

        fireEvent.press(screen.getByRole('switch', { name: categoryNames.c3 }));

        expect(latest.round?.enabled).toEqual(['c1', 'c2']);
        expect(latest.round?.unused.some(({ category }) => category === 'c3')).toBe(false);
        expect(
          screen.getByRole('switch', { name: categoryNames.c3, checked: false, disabled: true }),
        ).toBeOnTheScreen();
      });

      it('should leave the card in play alone when it is in another category', async () => {
        await renderPlay(threeCategories);
        takeThePhone();
        const cardId = latest.round?.current?.card.id;
        openSheet();

        fireEvent.press(screen.getByRole('switch', { name: categoryNames.c3 }));

        expect(latest.round?.current?.card.id).toBe(cardId);
        expect(isSheetOpen()).toBe(true);
      });

      it('should replace the card in play when it is in that category, and keep the sheet open', async () => {
        await renderPlay(threeCategories);
        takeThePhone();
        const cardId = latest.round?.current?.card.id;
        openSheet();

        fireEvent.press(screen.getByRole('switch', { name: categoryNames.c1 }));

        expect(latest.round?.current?.card.id).not.toBe(cardId);
        expect(latest.round?.current?.card.category).toBe('c2');
        expect(isSheetOpen()).toBe(true);
        expect(latest.round?.history).toHaveLength(0);
      });

      it('should show the replacement card behind the sheet once it is closed', async () => {
        await renderPlay(threeCategories);
        takeThePhone();
        openSheet();
        fireEvent.press(screen.getByRole('switch', { name: categoryNames.c1 }));

        press(copy.roundPlay.sheetClose);

        expect(screen.getByText(latest.round?.current?.card.text ?? '')).toBeOnTheScreen();
        expect(screen.getByText(categoryNames.c2)).toBeOnTheScreen();
      });

      it('should not step up to the replacement, because the cost is on the card', async () => {
        await renderPlay(threeCategories);
        playUntilCard(6);
        openSheet();

        fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));
        press(copy.roundPlay.sheetClose);

        expect(latest.round?.current?.steppingUp).toBe(true);
        expect(screen.queryByRole('button', { name: copy.roundPlay.stepUpButton })).toBeNull();
        expect(screen.getByRole('button', { name: copy.roundPlay.done })).toBeOnTheScreen();
      });

      it('should never deal a card of the switched off category again', async () => {
        await renderPlay(threeCategories);
        takeThePhone();
        openSheet();
        fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));
        press(copy.roundPlay.sheetClose);

        playUntilCard(10);
        pressDone();

        const categoriesPlayed = latest.round?.history.map(({ category }) => category);
        expect(categoriesPlayed).toHaveLength(10);
        expect(categoriesPlayed).not.toContain('c2');
      });

      it('should lock the last category on, and say why', async () => {
        await renderPlay(twoCategories);
        takeThePhone();
        openSheet();

        fireEvent.press(screen.getByRole('switch', { name: categoryNames.c1 }));

        const locked = screen.getByRole('switch', {
          name: categoryNames.c2,
          checked: true,
          disabled: true,
        });
        expect(locked).toHaveProp('accessibilityHint', copy.roundSetup.lastCategoryHint);
        fireEvent.press(locked);
        expect(latest.round?.enabled).toEqual(['c2']);
      });

      it('should show the summary, and no sheet, when the last card is in the category switched off', async () => {
        await renderPlay(
          { ...twoCategories, enabledCategories: ['c1', 'c2'] },
          {
            ...deckWithOneCard,
            cards: [
              {
                id: 'only-card',
                category: 'c1',
                kind: 'solo',
                text: 'Only card',
                source: 'shipped',
              },
            ],
          },
        );
        takeThePhone();
        openSheet();

        fireEvent.press(screen.getByRole('switch', { name: categoryNames.c1 }));

        expect(mockReplace).toHaveBeenCalledWith(summaryRoute);
        expect(isSheetOpen()).toBe(false);
      });

      it('should show a category that was never in the round as no switch', async () => {
        await renderPlay(twoCategories);
        takeThePhone();
        openSheet();

        expect(screen.queryByRole('switch', { name: categoryNames.c3 })).not.toBeOnTheScreen();
      });
    });

    describe('closing the sheet', () => {
      it('should close from Keep playing and leave the card as it was', async () => {
        await renderPlay(twoCategories);
        takeThePhone();
        const cardId = latest.round?.current?.card.id;
        openSheet();

        press(copy.roundPlay.sheetClose);

        expect(isSheetOpen()).toBe(false);
        expect(latest.round?.current?.card.id).toBe(cardId);
        expect(screen.getByText(textOfCard(twoCategories, 1))).toBeOnTheScreen();
      });

      it('should close, and not open the End round dialog, when the player goes back', async () => {
        await renderPlay(twoCategories);
        takeThePhone();
        openSheet();

        expect(mockPreventsRemove).toBe(true);
        act(() => mockOnRemovePrevented?.());

        expect(isSheetOpen()).toBe(false);
        expect(isDialogOpen()).toBe(false);
        expect(mockReplace).not.toHaveBeenCalled();
      });

      it('should open the End round dialog when the player goes back once the sheet is closed', async () => {
        await renderPlay(twoCategories);
        takeThePhone();
        openSheet();
        act(() => mockOnRemovePrevented?.());

        act(() => mockOnRemovePrevented?.());

        expect(isDialogOpen()).toBe(true);
      });
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
