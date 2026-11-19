import { categoryNames, copy, fillCopy, surpriseNames } from '@getfreak/content';
import {
  categories,
  reduceRound,
  startRound,
  summarise,
  type Card,
  type CategoryId,
  type CurrentCard,
  type CurrentSurprise,
  type Deck,
  type PlayerIndex,
  type RoundSetup,
  type RoundState,
  type SurpriseId,
} from '@getfreak/core';
import { act, fireEvent, screen } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { createFeedback } from '../../../feedback/createFeedback';
import { createMockFeedback } from '../../../feedback/createMockFeedback';
import { FeedbackContext } from '../../../feedback/FeedbackProvider';
import type { Feedback, FeedbackDevice } from '../../../feedback/types';
import { renderThemed } from '../../../tailwind/renderThemed';
import { RoundProvider, useRound } from '../../round/RoundProvider';
import type { PlayableSurpriseId } from '../playableSurprises';
import { RoundPlayScreen } from './RoundPlayScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: jest.fn(),
}));

function makeCards(category: CategoryId): Card[] {
  const solos: Card[] = Array.from({ length: 12 }, (_unused, index) => ({
    id: `${category}-solo-${index + 1}`,
    category,
    kind: 'solo',
    text: `Card ${category} solo ${index + 1}`,
    source: 'shipped',
  }));
  const together: Card = {
    id: `${category}-together`,
    category,
    kind: 'together',
    text: `Card ${category} together`,
    source: 'shipped',
  };
  // Timer cards are only dealt by the timer surprise. The seconds differ so a test can tell them apart.
  const timers: Card[] = [45, 20].map((seconds, index) => ({
    id: `${category}-timer-${index + 1}`,
    category,
    kind: 'solo',
    text: `Card ${category} timer ${index + 1}`,
    source: 'shipped',
    effect: { type: 'timer', seconds },
  }));
  return [...solos, together, ...timers];
}

const deck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [...makeCards('c1'), ...makeCards('c2'), ...makeCards('c3')],
};

const playerNames = ['Player A', 'Player B'] as const;

// Ten cards with a together card at 5 and 10. Over three categories the round steps up at cards 4
// and 7, and over two it steps up at card 6, straight after a together card.
const categoryChoices: readonly (readonly CategoryId[])[] = [
  ['c1', 'c2', 'c3'],
  ['c1', 'c2'],
];

function setupWith(
  seed: number,
  surprises: readonly SurpriseId[],
  enabledCategories: readonly CategoryId[],
): RoundSetup {
  return {
    players: [...playerNames],
    level: 'l3',
    enabledCategories,
    length: 10,
    seed,
    surprises,
  };
}

type SurpriseCard = {
  setup: RoundSetup;
  /** The card number, counting from 1. */
  number: number;
  current: CurrentCard;
  /** Who held the phone for the card before, if there was one. */
  previousPlayer: PlayerIndex | undefined;
  holdsFreePass: boolean;
};

function phoneChanges({ previousPlayer, current }: SurpriseCard) {
  return previousPlayer === undefined || previousPlayer !== current.player;
}

/**
 * Looks for a seed whose round deals a surprise of the wanted type that suits the test. Every
 * card before it is dealt and played with Done, so the test reaches it by pressing Done too.
 */
function findSurpriseCard(
  type: SurpriseId,
  surprises: readonly SurpriseId[] = [type],
  suits: (found: SurpriseCard) => boolean = () => true,
): SurpriseCard {
  const setups = categoryChoices.flatMap((enabledCategories) =>
    Array.from({ length: 400 }, (_unused, index) =>
      setupWith(index + 1, surprises, enabledCategories),
    ),
  );
  for (const setup of setups) {
    let state = startRound(setup, deck);
    while (state.current) {
      const { current } = state;
      const found: SurpriseCard = {
        setup,
        number: state.history.length + 1,
        current,
        previousPlayer: state.history.at(-1)?.player,
        holdsFreePass: state.freePasses[current.player],
      };
      if (current.surprise?.type === type && suits(found)) return found;
      if (current.surprise?.type === 'mystery') state = reduceRound(state, { type: 'flip' });
      if (current.surprise?.type === 'choice')
        state = reduceRound(state, { type: 'choose', index: 0 });
      state = reduceRound(state, { type: 'done' });
    }
  }
  throw new Error(`No seed deals a suitable ${type} surprise`);
}

function StartRound({ setup, children }: { setup: RoundSetup; children: ReactNode }) {
  const { startNewRound } = useRound();
  useEffect(() => startNewRound(setup, deck), [startNewRound, setup]);
  return children;
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

function roundNow(): RoundState {
  if (!latest.round) throw new Error('No round has been started');
  return latest.round;
}

async function renderPlay(setup: RoundSetup) {
  return renderThemed(
    <RoundProvider>
      <StartRound setup={setup}>
        <RoundProbe />
        <RoundPlayScreen />
      </StartRound>
    </RoundProvider>,
  );
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const has = (name: string) => screen.queryByRole('button', { name }) !== null;
const handoffTitle = (name: string) => fillCopy(copy.roundPlay.handoffTitle, { name });
const turnOf = (name: string) => fillCopy(copy.roundPlay.turnOf, { name });
const penaltyOf = (category: CategoryId) =>
  categories.find((candidate) => candidate.id === category)?.penalty ?? 0;
const nameOf = (player: PlayerIndex) => playerNames[player];

/** Presses Flip it and lets the card turn over, which Reanimated reports a moment after the press. */
async function flipTheCard() {
  press(copy.roundPlay.flip);
  await act(async () => {});
}

const isChoosing = () => screen.queryByRole('header', { name: /^Pick a dare for/ }) !== null;

/**
 * Presses through the step up, reveal and pass the phone screens, to the card. A choice that comes
 * on the way is settled with its first dare, so the cards before the one a test is about can be played.
 */
function reachTheCard() {
  // No card has more than a step up, a reveal and two passes before it, so a longer run is stuck.
  for (let presses = 0; presses < 8; presses += 1) {
    if (
      !has(copy.roundPlay.surpriseButton) &&
      !has(copy.roundPlay.handoffButton) &&
      !isChoosing()
    ) {
      return;
    }
    if (isChoosing()) {
      const { surprise } = roundNow().current ?? {};
      if (surprise?.type !== 'choice')
        throw new Error('The choice screen is showing for no choice');
      press(surprise.options[0].text);
    } else {
      press(
        has(copy.roundPlay.surpriseButton)
          ? copy.roundPlay.surpriseButton
          : copy.roundPlay.handoffButton,
      );
    }
  }
  throw new Error('The screens before the card did not end');
}

/** Plays the cards before this one with Done, and stops on the first screen of this card. */
function reachFirstScreenOf(number: number) {
  for (let played = 1; played < number; played += 1) {
    reachTheCard();
    press(has(copy.roundPlay.togetherDone) ? copy.roundPlay.togetherDone : copy.roundPlay.done);
  }
}

function expectedRule(found: SurpriseCard, type: PlayableSurpriseId): string {
  const { card, player } = found.current;
  switch (type) {
    case 'jump':
      return fillCopy(copy.roundPlay.surpriseRule.jump, {
        category: categoryNames[card.category],
        penalty: penaltyOf(card.category),
      });
    case 'swap':
      return fillCopy(copy.roundPlay.surpriseRule.swap, { name: nameOf(player) });
    case 'freePass':
      return fillCopy(copy.roundPlay.surpriseRule.freePass, { name: nameOf(player) });
    case 'mystery':
      return copy.roundPlay.surpriseRule.mystery;
    case 'timer':
      return copy.roundPlay.surpriseRule.timer;
    case 'choice': {
      const { surprise } = found.current;
      if (surprise?.type !== 'choice') throw new Error('Expected a choice');
      return fillCopy(copy.roundPlay.surpriseRule.choice, {
        chooser: nameOf(surprise.chooser),
        name: nameOf(player),
      });
    }
  }
}

describe('RoundPlayScreen with surprises', () => {
  afterEach(() => {
    latest.round = undefined;
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  describe.each(['mystery', 'jump', 'swap', 'freePass', 'timer', 'choice'] as const)(
    'a %s surprise',
    (type) => {
      it('should be revealed by name, with its rule line and whose turn it is, before the card', async () => {
        const found = findSurpriseCard(
          type,
          [type],
          (card) => !card.current.steppingUp || type === 'jump' || type === 'mystery',
        );
        await renderPlay(found.setup);
        reachFirstScreenOf(found.number);

        expect(screen.getByText(copy.roundPlay.surpriseTitle)).toBeOnTheScreen();
        expect(screen.getByRole('header', { name: surpriseNames[type] })).toBeOnTheScreen();
        expect(screen.getByText(expectedRule(found, type))).toBeOnTheScreen();
        expect(screen.getByText(turnOf(nameOf(found.current.player)))).toBeOnTheScreen();
        expect(screen.queryByText(found.current.card.text)).not.toBeOnTheScreen();
      });
    },
  );

  describe('the order of the screens before a card', () => {
    it.each(['swap', 'freePass'] as const)(
      'should be step up, reveal, pass the phone, then the card for a %s surprise',
      async (type) => {
        const found = findSurpriseCard(
          type,
          [type],
          (card) => card.current.steppingUp && phoneChanges(card),
        );
        await renderPlay(found.setup);
        reachFirstScreenOf(found.number);

        expect(screen.getByRole('header', { name: copy.roundPlay.stepUpTitle })).toBeOnTheScreen();
        press(copy.roundPlay.stepUpButton);
        expect(screen.getByRole('header', { name: surpriseNames[type] })).toBeOnTheScreen();
        press(copy.roundPlay.surpriseButton);
        expect(
          screen.getByRole('header', { name: handoffTitle(nameOf(found.current.player)) }),
        ).toBeOnTheScreen();
        press(copy.roundPlay.handoffButton);
        expect(screen.getByText(turnOf(nameOf(found.current.player)))).toBeOnTheScreen();
      },
    );

    it('should go from the reveal straight to the card when the phone does not change hands', async () => {
      const found = findSurpriseCard('swap', ['swap'], (card) => !phoneChanges(card));
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);

      press(copy.roundPlay.surpriseButton);

      expect(screen.queryByRole('header', { name: /Pass the phone/ })).not.toBeOnTheScreen();
      expect(screen.getByText(found.current.card.text)).toBeOnTheScreen();
    });

    it('should never show the step up screen, or its category, for a mystery dare before the flip', async () => {
      const found = findSurpriseCard('mystery', ['mystery'], (card) => card.current.steppingUp);
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);

      expect(screen.getByRole('header', { name: surpriseNames.mystery })).toBeOnTheScreen();
      expect(
        screen.queryByRole('header', { name: copy.roundPlay.stepUpTitle }),
      ).not.toBeOnTheScreen();
      press(copy.roundPlay.surpriseButton);
      if (phoneChanges(found)) press(copy.roundPlay.handoffButton);

      expect(screen.getByRole('img', { name: copy.roundPlay.faceDownLabel })).toBeOnTheScreen();
      expect(
        screen.queryByRole('header', { name: copy.roundPlay.stepUpTitle }),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText(categoryNames[found.current.card.category])).not.toBeOnTheScreen();
    });

    it('should let a category jump reveal take the place of the step up screen', async () => {
      const found = findSurpriseCard('jump', ['jump'], (card) => card.current.steppingUp);
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);

      expect(screen.getByRole('header', { name: surpriseNames.jump })).toBeOnTheScreen();
      expect(
        screen.queryByRole('header', { name: copy.roundPlay.stepUpTitle }),
      ).not.toBeOnTheScreen();
      press(copy.roundPlay.surpriseButton);
      if (phoneChanges(found)) press(copy.roundPlay.handoffButton);
      expect(screen.getByText(found.current.card.text)).toBeOnTheScreen();
      expect(
        screen.queryByRole('header', { name: copy.roundPlay.stepUpTitle }),
      ).not.toBeOnTheScreen();
    });
  });

  describe('a category jump card', () => {
    it('should carry the surprise chip and the penalty of the category jumped to', async () => {
      const found = findSurpriseCard('jump');
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);
      reachTheCard();

      expect(screen.getByRole('text', { name: surpriseNames.jump })).toBeOnTheScreen();
      expect(
        screen.getByText(
          fillCopy(copy.roundPlay.penalty, { penalty: penaltyOf(found.current.card.category) }),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('a role swap card', () => {
    it('should name the partner who now plays on the pass the phone screen, the turn line and the chip', async () => {
      const found = findSurpriseCard('swap', ['swap'], phoneChanges);
      const swapped = nameOf(found.current.player);
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);

      press(copy.roundPlay.surpriseButton);
      expect(screen.getByRole('header', { name: handoffTitle(swapped) })).toBeOnTheScreen();
      press(copy.roundPlay.handoffButton);

      expect(screen.getByText(turnOf(swapped))).toBeOnTheScreen();
      expect(screen.getByRole('text', { name: surpriseNames.swap })).toBeOnTheScreen();
    });

    it('should charge a pass to the partner who now plays', async () => {
      const found = findSurpriseCard('swap');
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);
      reachTheCard();
      const before = summarise(roundNow()).players[found.current.player].drinks;

      press(copy.roundPlay.pass);

      expect(summarise(roundNow()).players[found.current.player].drinks).toBe(
        before + penaltyOf(found.current.card.category),
      );
    });
  });

  describe('a mystery dare', () => {
    async function renderFaceDown() {
      const found = findSurpriseCard('mystery');
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);
      reachTheCard();
      return found;
    }

    it('should show the card face down with no card text and only Flip it to press', async () => {
      const found = await renderFaceDown();

      expect(screen.getByRole('img', { name: copy.roundPlay.faceDownLabel })).toBeOnTheScreen();
      expect(screen.queryByText(found.current.card.text)).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.roundPlay.flip })).toBeOnTheScreen();
      expect(has(copy.roundPlay.done)).toBe(false);
      expect(has(copy.roundPlay.pass)).toBe(false);
      expect(has(copy.roundPlay.notThisOne)).toBe(false);
    });

    it('should keep End round while the card is face down', async () => {
      await renderFaceDown();

      expect(screen.getByRole('button', { name: copy.roundPlay.endRound })).toBeOnTheScreen();
    });

    it('should send flip when Flip it is pressed', async () => {
      await renderFaceDown();

      await flipTheCard();

      expect(roundNow().current?.surprise).toEqual({ type: 'mystery', flipped: true });
    });

    it('should show the card as normal once flipped, with the surprise chip and the raised penalty line', async () => {
      const found = await renderFaceDown();

      await flipTheCard();

      expect(screen.getByText(found.current.card.text)).toBeOnTheScreen();
      expect(screen.getByRole('text', { name: surpriseNames.mystery })).toBeOnTheScreen();
      expect(
        screen.getByText(
          fillCopy(copy.roundPlay.flippedPenalty, {
            penalty: penaltyOf(found.current.card.category) + 1,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole('img', { name: copy.roundPlay.faceDownLabel }),
      ).not.toBeOnTheScreen();
      expect(has(copy.roundPlay.flip)).toBe(false);
    });

    it('should offer Done, Pass and Not this one only after the flip', async () => {
      await renderFaceDown();

      await flipTheCard();

      expect(has(copy.roundPlay.done)).toBe(true);
      expect(has(copy.roundPlay.pass)).toBe(true);
      expect(has(copy.roundPlay.notThisOne)).toBe(true);
    });

    it('should charge exactly the raised figure that the line promises for a pass', async () => {
      const found = await renderFaceDown();
      const before = summarise(roundNow()).players[found.current.player].drinks;
      await flipTheCard();

      press(copy.roundPlay.pass);

      expect(summarise(roundNow()).players[found.current.player].drinks).toBe(
        before + penaltyOf(found.current.card.category) + 1,
      );
    });

    it('should show the flipped card with reduced motion on', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      const found = await renderFaceDown();

      await flipTheCard();

      expect(screen.getByText(found.current.card.text)).toBeOnTheScreen();
    });

    it('should move screen reader focus to the card after the flip', async () => {
      const setFocus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
      setFocus.mockClear();
      await renderFaceDown();

      await flipTheCard();

      expect(setFocus).toHaveBeenCalledTimes(1);
      expect(setFocus).toHaveBeenCalledWith(expect.anything(), 'focus');
    });

    it('should start the next mystery dare face down again after one was flipped', async () => {
      const found = findSurpriseCard('mystery');
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);
      reachTheCard();
      await flipTheCard();
      press(copy.roundPlay.done);

      // One mystery dare is dealt in every block of five cards.
      while (!screen.queryByRole('img', { name: copy.roundPlay.faceDownLabel })) {
        reachTheCard();
        if (screen.queryByRole('img', { name: copy.roundPlay.faceDownLabel })) break;
        press(has(copy.roundPlay.togetherDone) ? copy.roundPlay.togetherDone : copy.roundPlay.done);
      }

      expect(has(copy.roundPlay.flip)).toBe(true);
      expect(has(copy.roundPlay.done)).toBe(false);
    });
  });

  describe('a free pass', () => {
    async function renderHolding() {
      const found = findSurpriseCard('freePass', ['freePass'], (card) => card.number <= 3);
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);
      reachTheCard();
      return found;
    }

    it("should show the marker and Use free pass on the holder's solo card, with no surprise chip", async () => {
      await renderHolding();

      expect(screen.getByRole('text', { name: copy.roundPlay.freePassMarker })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.roundPlay.useFreePass })).toBeOnTheScreen();
      expect(screen.queryByRole('text', { name: surpriseNames.freePass })).not.toBeOnTheScreen();
    });

    it('should send useFreePass, so nobody drinks and no dare is counted', async () => {
      const found = await renderHolding();
      const before = summarise(roundNow()).players[found.current.player];

      press(copy.roundPlay.useFreePass);

      expect(roundNow().history.at(-1)?.outcome).toBe('freePass');
      expect(summarise(roundNow()).players[found.current.player]).toEqual(before);
    });

    it('should confirm that the pass was used on the screen that follows', async () => {
      await renderHolding();

      press(copy.roundPlay.useFreePass);

      expect(screen.getByRole('status', { name: copy.roundPlay.freePassUsed })).toBeOnTheScreen();
    });

    it('should drop the confirmation once that screen has been dealt with', async () => {
      await renderHolding();
      press(copy.roundPlay.useFreePass);

      press(
        has(copy.roundPlay.handoffButton)
          ? copy.roundPlay.handoffButton
          : copy.roundPlay.stepUpButton,
      );

      expect(screen.queryByRole('status')).not.toBeOnTheScreen();
    });

    it('should not show the marker or the action once the pass is used', async () => {
      await renderHolding();
      press(copy.roundPlay.useFreePass);
      reachTheCard();

      expect(
        screen.queryByRole('text', { name: copy.roundPlay.freePassMarker }),
      ).not.toBeOnTheScreen();
      expect(has(copy.roundPlay.useFreePass)).toBe(false);
    });

    it("should not show on the other player's solo card", async () => {
      const found = findSurpriseCard('freePass', ['freePass'], (card) => card.number <= 3);
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number + 1);
      reachTheCard();

      expect(
        screen.getByText(turnOf(nameOf(found.current.player === 0 ? 1 : 0))),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole('text', { name: copy.roundPlay.freePassMarker }),
      ).not.toBeOnTheScreen();
      expect(has(copy.roundPlay.useFreePass)).toBe(false);
    });

    it('should not show on a together card', async () => {
      const found = findSurpriseCard('freePass', ['freePass'], (card) => card.number <= 3);
      await renderPlay(found.setup);
      reachFirstScreenOf(5);
      reachTheCard();

      expect(screen.getByText(copy.roundPlay.bothOfYou)).toBeOnTheScreen();
      expect(roundNow().freePasses[found.current.player]).toBe(true);
      expect(
        screen.queryByRole('text', { name: copy.roundPlay.freePassMarker }),
      ).not.toBeOnTheScreen();
      expect(has(copy.roundPlay.useFreePass)).toBe(false);
    });

    it('should not show on a mystery card until it has been flipped', async () => {
      const found = findSurpriseCard(
        'mystery',
        ['freePass', 'mystery'],
        (card) => card.holdsFreePass,
      );
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);
      reachTheCard();

      expect(screen.getByRole('img', { name: copy.roundPlay.faceDownLabel })).toBeOnTheScreen();
      expect(
        screen.queryByRole('text', { name: copy.roundPlay.freePassMarker }),
      ).not.toBeOnTheScreen();
      expect(has(copy.roundPlay.useFreePass)).toBe(false);

      await flipTheCard();

      expect(screen.getByRole('text', { name: copy.roundPlay.freePassMarker })).toBeOnTheScreen();
      expect(has(copy.roundPlay.useFreePass)).toBe(true);
    });
  });

  describe("partner's choice", () => {
    type ChoiceSurprise = Extract<CurrentSurprise, { type: 'choice' }>;

    function choiceOf(found: SurpriseCard): ChoiceSurprise {
      const { surprise } = found.current;
      if (surprise?.type !== 'choice') throw new Error('Expected a choice');
      return surprise;
    }

    /** The phone has to be passed to the chooser first when they do not already hold it. */
    const chooserNeedsPhone = (found: SurpriseCard) =>
      found.previousPlayer === undefined || found.previousPlayer !== choiceOf(found).chooser;

    async function renderAtChoice(suits: (found: SurpriseCard) => boolean = () => true) {
      const found = findSurpriseCard(
        'choice',
        ['choice'],
        (card) => !card.current.steppingUp && suits(card),
      );
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);
      press(copy.roundPlay.surpriseButton);
      if (chooserNeedsPhone(found)) press(copy.roundPlay.handoffButton);
      return { found, options: choiceOf(found).options, chooser: choiceOf(found).chooser };
    }

    it('should go from the reveal to the chooser, who is passed the phone when they do not hold it', async () => {
      const found = findSurpriseCard(
        'choice',
        ['choice'],
        (card) => !card.current.steppingUp && chooserNeedsPhone(card),
      );
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);

      press(copy.roundPlay.surpriseButton);

      expect(
        screen.getByRole('header', { name: handoffTitle(nameOf(choiceOf(found).chooser)) }),
      ).toBeOnTheScreen();
      expect(screen.queryByText(choiceOf(found).options[0].text)).not.toBeOnTheScreen();
      expect(screen.queryByText(choiceOf(found).options[1].text)).not.toBeOnTheScreen();
    });

    it('should go from the reveal straight to the choice when the chooser already holds the phone', async () => {
      const found = findSurpriseCard(
        'choice',
        ['choice'],
        (card) => !card.current.steppingUp && !chooserNeedsPhone(card),
      );
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);

      press(copy.roundPlay.surpriseButton);

      expect(screen.queryByRole('header', { name: /Pass the phone/ })).not.toBeOnTheScreen();
      expect(isChoosing()).toBe(true);
    });

    it('should come after the step up screen when the card steps up', async () => {
      const found = findSurpriseCard('choice', ['choice'], (card) => card.current.steppingUp);
      await renderPlay(found.setup);
      reachFirstScreenOf(found.number);

      expect(screen.getByRole('header', { name: copy.roundPlay.stepUpTitle })).toBeOnTheScreen();
      press(copy.roundPlay.stepUpButton);
      expect(screen.getByRole('header', { name: surpriseNames.choice })).toBeOnTheScreen();
    });

    it('should show the chooser the two dares as buttons named by their text, and say who they are for', async () => {
      const { found, options } = await renderAtChoice();

      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.roundPlay.choicePrompt, { name: nameOf(found.current.player) }),
        }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: options[0].text })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: options[1].text })).toBeOnTheScreen();
    });

    it('should offer End round and nothing to answer with while a dare is being picked', async () => {
      await renderAtChoice();

      expect(has(copy.roundPlay.endRound)).toBe(true);
      expect(has(copy.roundPlay.done)).toBe(false);
      expect(has(copy.roundPlay.pass)).toBe(false);
      expect(has(copy.roundPlay.notThisOne)).toBe(false);
    });

    it('should open the end round dialog from the choice screen', async () => {
      await renderAtChoice();

      press(copy.roundPlay.endRound);

      expect(screen.getByText(copy.roundPlay.endDialogTitle)).toBeOnTheScreen();
    });

    it.each([0, 1] as const)(
      'should send choose with index %i when that dare is pressed',
      async (index) => {
        const { options } = await renderAtChoice();

        press(options[index].text);

        expect(roundNow().current?.surprise).toMatchObject({ type: 'choice', chosen: index });
        expect(roundNow().current?.card.id).toBe(options[index].id);
      },
    );

    it.each([0, 1] as const)(
      'should pass the phone to the player before the picked dare shows, and never show the other (pick %i)',
      async (index) => {
        const { found, options, chooser } = await renderAtChoice();
        const other = options[index === 0 ? 1 : 0];

        press(options[index].text);

        expect(
          screen.getByRole('header', { name: handoffTitle(nameOf(found.current.player)) }),
        ).toBeOnTheScreen();
        expect(
          screen.getByText(fillCopy(copy.roundPlay.handoffLine, { name: nameOf(chooser) })),
        ).toBeOnTheScreen();
        expect(screen.queryByText(options[index].text)).not.toBeOnTheScreen();
        expect(screen.queryByText(other.text)).not.toBeOnTheScreen();

        press(copy.roundPlay.handoffButton);

        expect(screen.getByText(options[index].text)).toBeOnTheScreen();
        expect(screen.queryByText(other.text)).not.toBeOnTheScreen();
      },
    );

    it("should show the picked card as normal, with the surprise chip and the player's turn", async () => {
      const { found, options } = await renderAtChoice();
      press(options[1].text);
      press(copy.roundPlay.handoffButton);

      expect(screen.getByText(turnOf(nameOf(found.current.player)))).toBeOnTheScreen();
      expect(screen.getByRole('text', { name: surpriseNames.choice })).toBeOnTheScreen();
      expect(
        screen.getByText(
          fillCopy(copy.roundPlay.penalty, { penalty: penaltyOf(options[1].category) }),
        ),
      ).toBeOnTheScreen();
      expect(has(copy.roundPlay.done)).toBe(true);
      expect(has(copy.roundPlay.pass)).toBe(true);
    });

    it('should count the picked card as done, and put the other dare back into the deal', async () => {
      const { found, options } = await renderAtChoice();
      press(options[0].text);
      press(copy.roundPlay.handoffButton);

      press(copy.roundPlay.done);

      expect(roundNow().history.at(-1)).toMatchObject({
        cardId: options[0].id,
        outcome: 'done',
        player: found.current.player,
      });
      expect(roundNow().unused.some((card) => card.id === options[1].id)).toBe(true);
    });

    it('should charge the player, not the chooser, for a pass', async () => {
      const { found, options, chooser } = await renderAtChoice();
      press(options[0].text);
      press(copy.roundPlay.handoffButton);
      const before = summarise(roundNow()).players;

      press(copy.roundPlay.pass);

      const after = summarise(roundNow()).players;
      expect(after[found.current.player].drinks).toBe(
        before[found.current.player].drinks + penaltyOf(options[0].category),
      );
      expect(after[chooser].drinks).toBe(before[chooser].drinks);
    });
  });

  describe('a timer card', () => {
    const feedback = createMockFeedback();
    let stateListeners: Array<(state: AppStateStatus) => void>;

    async function renderTimerCard(
      options: { suits?: (found: SurpriseCard) => boolean; feedbackValue?: Feedback } = {},
    ) {
      const found = findSurpriseCard(
        'timer',
        ['timer'],
        (card) => !card.current.steppingUp && (options.suits?.(card) ?? true),
      );
      const { surprise } = found.current;
      if (surprise?.type !== 'timer') throw new Error('Expected a timer');
      await renderThemed(
        <FeedbackContext.Provider value={options.feedbackValue ?? feedback}>
          <RoundProvider>
            <StartRound setup={found.setup}>
              <RoundProbe />
              <RoundPlayScreen />
            </StartRound>
          </RoundProvider>
        </FeedbackContext.Provider>,
      );
      reachFirstScreenOf(found.number);
      return { found, seconds: surprise.seconds };
    }

    const countdown = () => screen.getByRole('timer', { name: copy.roundPlay.countdownLabel });
    const secondsLabel = (count: number) =>
      fillCopy(
        count === 1 ? copy.roundPlay.countdownSecondsOne : copy.roundPlay.countdownSecondsMany,
        { count },
      );
    const doneButton = (disabled: boolean) =>
      screen.getByRole('button', { name: copy.roundPlay.done, disabled });
    const advance = (milliseconds: number) =>
      act(async () => {
        jest.advanceTimersByTime(milliseconds);
      });

    beforeEach(() => {
      jest.useFakeTimers();
      Object.values(feedback).forEach((call) => call.mockClear());
      stateListeners = [];
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
        stateListeners.push(listener);
        return { remove: jest.fn() };
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    it('should not start the clock on the reveal or on the pass the phone screen', async () => {
      const { seconds } = await renderTimerCard({ suits: phoneChanges });
      expect(screen.queryByRole('timer')).not.toBeOnTheScreen();

      await advance(20_000);
      press(copy.roundPlay.surpriseButton);
      expect(screen.queryByRole('timer')).not.toBeOnTheScreen();
      await advance(20_000);
      press(copy.roundPlay.handoffButton);

      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(seconds) });
    });

    it('should show the surprise chip and the countdown under the card, with Done locked and the running hint', async () => {
      const { found, seconds } = await renderTimerCard();
      reachTheCard();

      expect(screen.getByText(found.current.card.text)).toBeOnTheScreen();
      expect(screen.getByRole('text', { name: surpriseNames.timer })).toBeOnTheScreen();
      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(seconds) });
      expect(doneButton(true)).toBeOnTheScreen();
      expect(screen.getByText(copy.roundPlay.timerRunning)).toBeOnTheScreen();
      expect(screen.queryByText(copy.roundPlay.timerDone)).not.toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: copy.roundPlay.pass, disabled: false }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: copy.roundPlay.notThisOne, disabled: false }),
      ).toBeOnTheScreen();
    });

    it('should not take Done while the clock is running', async () => {
      await renderTimerCard();
      reachTheCard();
      const playedBefore = roundNow().history.length;

      fireEvent.press(doneButton(true));
      await advance(5_000);
      fireEvent.press(doneButton(true));

      expect(roundNow().history.length).toBe(playedBefore);
    });

    it('should count down once a second from when the card showed', async () => {
      const { seconds } = await renderTimerCard();
      reachTheCard();

      await advance(3_000);

      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(seconds - 3) });
    });

    it('should unlock Done at zero, swap the hint and play the end haptic once', async () => {
      const { seconds } = await renderTimerCard();
      reachTheCard();

      await advance(seconds * 1000 - 1_000);
      expect(doneButton(true)).toBeOnTheScreen();
      expect(feedback.timerEnd).not.toHaveBeenCalled();
      await advance(1_000);

      expect(doneButton(false)).toBeOnTheScreen();
      expect(screen.getByText(copy.roundPlay.timerDone)).toBeOnTheScreen();
      expect(screen.queryByText(copy.roundPlay.timerRunning)).not.toBeOnTheScreen();
      expect(feedback.timerEnd).toHaveBeenCalledTimes(1);

      await advance(30_000);
      expect(feedback.timerEnd).toHaveBeenCalledTimes(1);
    });

    it('should count Done as a done dare once it is unlocked', async () => {
      const { found, seconds } = await renderTimerCard();
      reachTheCard();
      await advance(seconds * 1000);

      press(copy.roundPlay.done);

      expect(roundNow().history.at(-1)).toMatchObject({
        cardId: found.current.card.id,
        outcome: 'done',
        surprise: 'timer',
      });
    });

    it('should let Pass work at any time, and stop the clock so no haptic comes later', async () => {
      const { found, seconds } = await renderTimerCard();
      reachTheCard();
      await advance(2_000);

      press(copy.roundPlay.pass);
      await advance(seconds * 1000 + 10_000);

      expect(roundNow().history.at(-1)).toMatchObject({
        cardId: found.current.card.id,
        outcome: 'passed',
      });
      expect(feedback.timerEnd).not.toHaveBeenCalled();
    });

    it('should let Not this one skip the card at any time, and stop the clock so no haptic comes later', async () => {
      const { found, seconds } = await renderTimerCard();
      reachTheCard();
      await advance(2_000);

      press(copy.roundPlay.notThisOne);
      press(copy.roundPlay.skipTitle);
      await advance(seconds * 1000 + 10_000);

      expect(roundNow().current?.card.id).not.toBe(found.current.card.id);
      expect(screen.queryByRole('timer')).not.toBeOnTheScreen();
      expect(feedback.timerEnd).not.toHaveBeenCalled();
    });

    it('should keep the clock going when End round is pressed and then cancelled', async () => {
      const { seconds } = await renderTimerCard();
      reachTheCard();
      await advance(2_000);
      press(copy.roundPlay.endRound);
      press(copy.roundPlay.endDialogCancel);

      await advance(1_000);

      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(seconds - 3) });
    });

    it('should keep running on real time while the app is in the background', async () => {
      const { seconds } = await renderTimerCard();
      reachTheCard();
      await act(async () => stateListeners.forEach((listener) => listener('background')));

      jest.setSystemTime(Date.now() + seconds * 1000 + 5_000);
      await advance(30_000);
      expect(doneButton(true)).toBeOnTheScreen();
      await act(async () => stateListeners.forEach((listener) => listener('active')));

      expect(doneButton(false)).toBeOnTheScreen();
      expect(screen.getByText(copy.roundPlay.timerDone)).toBeOnTheScreen();
      expect(feedback.timerEnd).toHaveBeenCalledTimes(1);
    });

    it('should show the next card with no countdown and Done open once the timer card is answered', async () => {
      const { seconds } = await renderTimerCard();
      reachTheCard();
      await advance(seconds * 1000);
      press(copy.roundPlay.done);
      reachTheCard();

      expect(screen.queryByRole('timer')).not.toBeOnTheScreen();
      expect(
        screen.getByRole('button', {
          name: has(copy.roundPlay.togetherDone)
            ? copy.roundPlay.togetherDone
            : copy.roundPlay.done,
          disabled: false,
        }),
      ).toBeOnTheScreen();
    });

    describe('the end haptic and the haptics setting', () => {
      const createFakeDevice = (): FeedbackDevice => ({
        playSound: jest.fn(),
        triggerHaptic: jest.fn(),
        cancelHaptics: jest.fn(),
      });

      it('should ask the device for the timer end haptic when haptics are on', async () => {
        const device = createFakeDevice();
        const { seconds } = await renderTimerCard({
          feedbackValue: createFeedback(device, { soundOn: true, hapticsOn: true }),
        });
        reachTheCard();

        await advance(seconds * 1000);

        // The presses that got to this card gave their own feedback, so only the timer's is counted.
        const timerEnds = jest
          .mocked(device.triggerHaptic)
          .mock.calls.filter(([moment]) => moment === 'timerEnd');
        expect(timerEnds).toHaveLength(1);
      });

      it('should ask for nothing when haptics are off', async () => {
        const device = createFakeDevice();
        const { seconds } = await renderTimerCard({
          feedbackValue: createFeedback(device, { soundOn: true, hapticsOn: false }),
        });
        reachTheCard();

        await advance(seconds * 1000);

        expect(device.triggerHaptic).not.toHaveBeenCalled();
        expect(doneButton(false)).toBeOnTheScreen();
      });
    });
  });

  describe('with surprises off', () => {
    it('should show no reveal, no marker and no free pass action in any card', async () => {
      await renderPlay(setupWith(7, [], ['c1', 'c2', 'c3']));

      for (
        let played = 1;
        played <= 10 && screen.queryAllByRole('button').length > 0;
        played += 1
      ) {
        reachTheCard();
        expect(screen.queryByText(copy.roundPlay.surpriseTitle)).not.toBeOnTheScreen();
        expect(
          screen.queryByRole('text', { name: copy.roundPlay.freePassMarker }),
        ).not.toBeOnTheScreen();
        expect(has(copy.roundPlay.useFreePass)).toBe(false);
        expect(has(copy.roundPlay.flip)).toBe(false);
        press(has(copy.roundPlay.togetherDone) ? copy.roundPlay.togetherDone : copy.roundPlay.done);
      }
    });
  });
});
