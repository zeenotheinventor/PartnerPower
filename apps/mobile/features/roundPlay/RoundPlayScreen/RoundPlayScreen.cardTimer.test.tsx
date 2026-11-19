import { copy, fillCopy } from '@getfreak/content';
import type { Card, Deck, RoundSetup } from '@getfreak/core';
import { act, fireEvent, screen } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { createMockFeedback } from '../../../feedback/createMockFeedback';
import { FeedbackContext } from '../../../feedback/FeedbackProvider';
import { renderThemed } from '../../../tailwind/renderThemed';
import { RoundProvider, useRound } from '../../round/RoundProvider';
import { startVibration } from '../../vibration/vibration';
import { RoundPlayScreen } from './RoundPlayScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: jest.fn(),
}));

const cardSeconds = 90;

const cardsWith = (extra: Partial<Card>): Card[] =>
  Array.from({ length: 12 }, (_unused, index) => ({
    id: `c1-solo-${index + 1}`,
    category: 'c1',
    kind: 'solo',
    text: `Card ${index + 1}`,
    source: 'shipped',
    ...extra,
  }));

const timedDeck: Deck = {
  id: 'timed-deck',
  version: 1,
  cards: cardsWith({ seconds: cardSeconds }),
};
const plainDeck: Deck = { id: 'plain-deck', version: 1, cards: cardsWith({}) };
const vibrationDeck: Deck = {
  id: 'vibration-deck',
  version: 1,
  cards: cardsWith({ effect: { type: 'vibrate', seconds: 10 } }),
};

const setup: RoundSetup = {
  players: ['Player A', 'Player B'],
  level: 'l1',
  enabledCategories: ['c1'],
  length: 10,
  seed: 1,
  surprises: [],
};

function StartRound({ deck, children }: { deck: Deck; children: ReactNode }) {
  const { startNewRound } = useRound();
  useEffect(() => startNewRound(setup, deck), [startNewRound, deck]);
  return children;
}

const feedback = createMockFeedback();

async function renderCard(deck: Deck = timedDeck) {
  const view = await renderThemed(
    <FeedbackContext.Provider value={feedback}>
      <RoundProvider>
        <StartRound deck={deck}>
          <RoundPlayScreen />
        </StartRound>
      </RoundProvider>
    </FeedbackContext.Provider>,
  );
  // Nobody held the phone before the first card, so it is passed first.
  fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.handoffButton }));
  return view;
}

const button = (name: string, disabled = false) => screen.queryByRole('button', { name, disabled });
const countdown = () => screen.getByRole('timer', { name: copy.roundPlay.countdownLabel });
const secondsLabel = (count: number) =>
  fillCopy(count === 1 ? copy.roundPlay.countdownSecondsOne : copy.roundPlay.countdownSecondsMany, {
    count,
  });
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const advance = (milliseconds: number) =>
  act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
const firstCardCount = () =>
  screen.queryByText(fillCopy(copy.roundPlay.cardCount, { number: 1, length: 10 }));

describe('a card with a time on it', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.values(feedback).forEach((call) => call.mockClear());
    jest.mocked(startVibration).mockClear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('before Start is pressed', () => {
    it('should show the full time on the countdown, with Start and the usual answers open', async () => {
      await renderCard();

      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(cardSeconds) });
      expect(screen.getByText('1:30')).toBeOnTheScreen();
      expect(button(copy.roundPlay.cardTimerStart)).toBeEnabled();
      expect(button(copy.roundPlay.cardTimerStop)).not.toBeOnTheScreen();
      expect(button(copy.roundPlay.done)).toBeEnabled();
      expect(button(copy.roundPlay.pass)).toBeEnabled();
    });

    it('should not count down until Start is pressed', async () => {
      await renderCard();
      await advance(20_000);

      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(cardSeconds) });
      expect(feedback.timerEnd).not.toHaveBeenCalled();
    });

    it('should not vibrate the phone', async () => {
      await renderCard();
      press(copy.roundPlay.cardTimerStart);

      expect(startVibration).not.toHaveBeenCalled();
    });
  });

  describe('when Start is pressed', () => {
    it('should swap Start for Stop and count down', async () => {
      await renderCard();
      press(copy.roundPlay.cardTimerStart);
      await advance(30_000);

      expect(button(copy.roundPlay.cardTimerStop)).toBeEnabled();
      expect(button(copy.roundPlay.cardTimerStart)).not.toBeOnTheScreen();
      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(60) });
    });

    it('should leave Done, Pass, Not this one and End round open', async () => {
      await renderCard();
      press(copy.roundPlay.cardTimerStart);

      expect(button(copy.roundPlay.done)).toBeEnabled();
      expect(button(copy.roundPlay.pass)).toBeEnabled();
      expect(button(copy.roundPlay.notThisOne)).toBeEnabled();
      expect(button(copy.roundPlay.endRound)).toBeEnabled();
    });

    it('should answer the card when Done is pressed while it runs', async () => {
      await renderCard();
      press(copy.roundPlay.cardTimerStart);
      expect(firstCardCount()).toBeOnTheScreen();

      press(copy.roundPlay.done);

      expect(firstCardCount()).not.toBeOnTheScreen();
    });
  });

  describe('when Stop is pressed', () => {
    it('should show Start again with the full time and give no end feedback', async () => {
      await renderCard();
      press(copy.roundPlay.cardTimerStart);
      await advance(30_000);

      press(copy.roundPlay.cardTimerStop);

      expect(button(copy.roundPlay.cardTimerStart)).toBeEnabled();
      expect(button(copy.roundPlay.cardTimerStop)).not.toBeOnTheScreen();
      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(cardSeconds) });
      expect(feedback.timerEnd).not.toHaveBeenCalled();
    });

    it('should not run out later on the time it had been started with', async () => {
      await renderCard();
      press(copy.roundPlay.cardTimerStart);
      await advance(30_000);
      press(copy.roundPlay.cardTimerStop);

      await advance(cardSeconds * 1000);

      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(cardSeconds) });
      expect(feedback.timerEnd).not.toHaveBeenCalled();
    });
  });

  describe('when the time is up', () => {
    it('should rest at 0:00 with Start back and the end feedback given once', async () => {
      await renderCard();
      press(copy.roundPlay.cardTimerStart);

      await advance(cardSeconds * 1000);
      await advance(5_000);

      expect(screen.getByText('0:00')).toBeOnTheScreen();
      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(0) });
      expect(button(copy.roundPlay.cardTimerStart)).toBeEnabled();
      expect(button(copy.roundPlay.done)).toBeEnabled();
      expect(feedback.timerEnd).toHaveBeenCalledTimes(1);
    });

    it('should run again from the full time when Start is pressed again', async () => {
      await renderCard();
      press(copy.roundPlay.cardTimerStart);
      await advance(cardSeconds * 1000);

      press(copy.roundPlay.cardTimerStart);
      await advance(10_000);

      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(80) });
      expect(button(copy.roundPlay.cardTimerStop)).toBeEnabled();

      await advance(80_000);

      expect(feedback.timerEnd).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the card is no longer on the screen', () => {
    it('should leave no clock ticking and give no end feedback after the screen is left', async () => {
      const view = await renderCard();
      press(copy.roundPlay.cardTimerStart);
      await advance(10_000);

      view.unmount();
      const scheduleTimeout = jest.spyOn(globalThis, 'setTimeout');
      await advance(cardSeconds * 1000);

      expect(scheduleTimeout).not.toHaveBeenCalled();
      expect(feedback.timerEnd).not.toHaveBeenCalled();
    });
  });

  describe('on a card with no time', () => {
    it('should show no countdown, Start or Stop', async () => {
      await renderCard(plainDeck);

      expect(screen.queryByRole('timer')).not.toBeOnTheScreen();
      expect(button(copy.roundPlay.cardTimerStart)).not.toBeOnTheScreen();
      expect(button(copy.roundPlay.cardTimerStop)).not.toBeOnTheScreen();
      expect(button(copy.roundPlay.done)).toBeEnabled();
    });
  });

  describe('on a vibration card', () => {
    it('should keep its own Go button and show no Start', async () => {
      await renderCard(vibrationDeck);

      expect(button(copy.roundPlay.vibrationGo)).toBeEnabled();
      expect(button(copy.roundPlay.cardTimerStart)).not.toBeOnTheScreen();
      expect(screen.getAllByRole('timer')).toHaveLength(1);
    });
  });
});
