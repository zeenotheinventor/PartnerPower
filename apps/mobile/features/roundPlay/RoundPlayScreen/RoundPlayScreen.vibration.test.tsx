import { copy, fillCopy } from '@getfreak/content';
import type { Card, Deck, RoundAction, RoundSetup } from '@getfreak/core';
import { act, fireEvent, screen } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { RoundProvider, useRound } from '../../round/RoundProvider';
import { startVibration, stopVibration } from '../../vibration/vibration';
import { RoundPlayScreen } from './RoundPlayScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: jest.fn(),
}));

const vibrationSeconds = 10;

const cardsOf = (effect: Card['effect']): Card[] =>
  Array.from({ length: 12 }, (_unused, index) => ({
    id: `c1-solo-${effect?.type ?? 'plain'}-${index + 1}`,
    category: 'c1',
    kind: 'solo',
    text: `Card ${effect?.type ?? 'plain'} ${index + 1}`,
    source: 'shipped',
    ...(effect ? { effect } : {}),
  }));

const vibrationDeck: Deck = {
  id: 'vibration-deck',
  version: 1,
  cards: cardsOf({ type: 'vibrate', seconds: vibrationSeconds }),
};
const plainDeck: Deck = { id: 'plain-deck', version: 1, cards: cardsOf(undefined) };

const setup: RoundSetup = {
  players: ['Player A', 'Player B'],
  level: 'l1',
  enabledCategories: ['c1'],
  length: 10,
  seed: 1,
  surprises: [],
};

const latest: { dispatch?: (action: RoundAction) => void } = {};

function StartRound({ deck, children }: { deck: Deck; children: ReactNode }) {
  const { startNewRound, dispatch } = useRound();
  useEffect(() => {
    latest.dispatch = dispatch;
  }, [dispatch]);
  useEffect(() => startNewRound(setup, deck), [startNewRound, deck]);
  return children;
}

async function renderCard(deck: Deck = vibrationDeck) {
  const view = await renderThemed(
    <RoundProvider>
      <StartRound deck={deck}>
        <RoundPlayScreen />
      </StartRound>
    </RoundProvider>,
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

describe('a vibration card', () => {
  let stateListeners: Array<(state: AppStateStatus) => void>;
  const changeAppState = (state: AppStateStatus) =>
    act(async () => stateListeners.forEach((listener) => listener(state)));

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(startVibration).mockClear();
    jest.mocked(stopVibration).mockClear();
    stateListeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      stateListeners.push(listener);
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    latest.dispatch = undefined;
  });

  describe('before Go is pressed', () => {
    it('should show the full time on the countdown, with Go and the usual answers open', async () => {
      await renderCard();

      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(vibrationSeconds) });
      expect(button(copy.roundPlay.vibrationGo)).toBeEnabled();
      expect(button(copy.roundPlay.vibrationStop)).not.toBeOnTheScreen();
      expect(button(copy.roundPlay.done)).toBeEnabled();
      expect(button(copy.roundPlay.pass)).toBeEnabled();
    });

    it('should not vibrate until Go is pressed', async () => {
      await renderCard();
      await advance(5_000);

      expect(startVibration).not.toHaveBeenCalled();
    });

    it('should show nothing about the phone settings', async () => {
      await renderCard();

      expect(screen.queryByText(copy.roundPlay.vibrationBlocked)).not.toBeOnTheScreen();
    });
  });

  describe('when Go is pressed', () => {
    it('should start the vibration for the seconds on the card', async () => {
      await renderCard();

      press(copy.roundPlay.vibrationGo);

      expect(startVibration).toHaveBeenCalledTimes(1);
      expect(startVibration).toHaveBeenCalledWith(vibrationSeconds);
    });

    it('should not start the vibration again when Go is pressed a second time while it runs', async () => {
      const { getByRole } = await renderCard();
      const go = getByRole('button', { name: copy.roundPlay.vibrationGo });

      // Both presses land before the screen has drawn Stop in place of Go.
      act(() => {
        fireEvent.press(go);
        fireEvent.press(go);
      });

      expect(startVibration).toHaveBeenCalledTimes(1);
    });

    it('should swap Go for Stop and count down', async () => {
      await renderCard();
      press(copy.roundPlay.vibrationGo);
      await advance(4_000);

      expect(button(copy.roundPlay.vibrationStop)).toBeEnabled();
      expect(button(copy.roundPlay.vibrationGo)).not.toBeOnTheScreen();
      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(6) });
    });

    it('should disable everything except Stop while it runs', async () => {
      await renderCard();
      press(copy.roundPlay.vibrationGo);

      expect(button(copy.roundPlay.done, true)).toBeOnTheScreen();
      expect(button(copy.roundPlay.pass, true)).toBeOnTheScreen();
      expect(button(copy.roundPlay.notThisOne, true)).toBeOnTheScreen();
      expect(button(copy.roundPlay.endRound, true)).toBeOnTheScreen();
      expect(button(copy.roundPlay.vibrationStop)).toBeEnabled();
    });

    it('should not answer the card when a disabled answer is pressed', async () => {
      await renderCard();
      press(copy.roundPlay.vibrationGo);

      fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.done }));

      expect(
        screen.getByText(fillCopy(copy.roundPlay.cardCount, { number: 1, length: 10 })),
      ).toBeOnTheScreen();
    });
  });

  describe('when Stop is pressed', () => {
    it('should stop the vibration at once', async () => {
      await renderCard();
      press(copy.roundPlay.vibrationGo);
      jest.mocked(stopVibration).mockClear();

      press(copy.roundPlay.vibrationStop);

      expect(stopVibration).toHaveBeenCalledTimes(1);
    });

    it('should open the answers again and show Go with the full time', async () => {
      await renderCard();
      press(copy.roundPlay.vibrationGo);
      await advance(4_000);

      press(copy.roundPlay.vibrationStop);

      expect(button(copy.roundPlay.vibrationGo)).toBeEnabled();
      expect(button(copy.roundPlay.done)).toBeEnabled();
      expect(button(copy.roundPlay.notThisOne)).toBeEnabled();
      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(vibrationSeconds) });
    });
  });

  describe('when the time is up', () => {
    it('should stay at 0:00 with Go back and the answers open', async () => {
      await renderCard();
      press(copy.roundPlay.vibrationGo);

      await advance(vibrationSeconds * 1000);

      expect(screen.getByText('0:00')).toBeOnTheScreen();
      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(0) });
      expect(button(copy.roundPlay.vibrationGo)).toBeEnabled();
      expect(button(copy.roundPlay.done)).toBeEnabled();
      expect(button(copy.roundPlay.pass)).toBeEnabled();
    });

    it('should stop the vibration so it ends with the countdown', async () => {
      await renderCard();
      press(copy.roundPlay.vibrationGo);
      jest.mocked(stopVibration).mockClear();

      await advance(vibrationSeconds * 1000);

      expect(stopVibration).toHaveBeenCalled();
    });

    it('should start again from the full time when Go is pressed again', async () => {
      await renderCard();
      press(copy.roundPlay.vibrationGo);
      await advance(vibrationSeconds * 1000);

      press(copy.roundPlay.vibrationGo);
      await advance(3_000);

      expect(startVibration).toHaveBeenCalledTimes(2);
      expect(countdown()).toHaveAccessibilityValue({ text: secondsLabel(7) });
      expect(button(copy.roundPlay.vibrationStop)).toBeEnabled();
    });
  });

  describe('when the card is no longer on the screen', () => {
    it.each(['background', 'inactive'] as const)(
      'should stop the vibration when the app goes %s',
      async (state) => {
        await renderCard();
        press(copy.roundPlay.vibrationGo);
        jest.mocked(stopVibration).mockClear();

        await changeAppState(state);

        expect(stopVibration).toHaveBeenCalledTimes(1);
        expect(button(copy.roundPlay.vibrationGo)).toBeEnabled();
        expect(button(copy.roundPlay.done)).toBeEnabled();
      },
    );

    it('should not stop anything when the app goes to the background and Go was never pressed', async () => {
      await renderCard();

      await changeAppState('background');

      expect(stopVibration).not.toHaveBeenCalled();
    });

    it('should stop the vibration when the screen is left', async () => {
      const view = await renderCard();
      press(copy.roundPlay.vibrationGo);
      jest.mocked(stopVibration).mockClear();

      view.unmount();

      expect(stopVibration).toHaveBeenCalledTimes(1);
    });

    it('should stop the vibration when the round ends', async () => {
      await renderCard();
      press(copy.roundPlay.vibrationGo);
      jest.mocked(stopVibration).mockClear();

      await act(async () => latest.dispatch?.({ type: 'end' }));

      expect(stopVibration).toHaveBeenCalled();
    });
  });

  describe('on a card with no vibration effect', () => {
    it('should show no countdown, Go or Stop', async () => {
      await renderCard(plainDeck);

      expect(screen.queryByRole('timer')).not.toBeOnTheScreen();
      expect(button(copy.roundPlay.vibrationGo)).not.toBeOnTheScreen();
      expect(button(copy.roundPlay.vibrationStop)).not.toBeOnTheScreen();
      expect(button(copy.roundPlay.done)).toBeEnabled();
    });
  });
});
