import { copy, fillCopy } from '@getfreak/content';
import type { Deck, RoundAction, RoundSetup } from '@getfreak/core';
import { act, fireEvent, screen } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';

import { createMockFeedback } from '../../../feedback/createMockFeedback';
import { FeedbackContext } from '../../../feedback/FeedbackProvider';
import { PersonalDataProvider } from '../../../personal';
import type { PersonalDataSource } from '../../../personal';
import type { PersonalRepository } from '../../../storage';
import { createInMemoryPersonalRepository } from '../../../storage/personal/createInMemoryPersonalRepository';
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

function makeRepository(): PersonalRepository {
  return createInMemoryPersonalRepository({
    getShippedCards: () => deck.cards,
    randomUUID: () => '00000000-0000-4000-8000-000000000001',
    now: () => 1,
  });
}

// The personal store opens when the test says so, inside an act, so nothing updates outside one.
let personalRepository: PersonalRepository;
let personalSource: PersonalDataSource;
let openPersonalStore: () => Promise<void>;

function prepareEmptyPersonalStore() {
  personalRepository = makeRepository();
  let open: (repository: PersonalRepository) => void = () => {};
  personalSource = {
    load: () => new Promise<PersonalRepository>((resolve) => (open = resolve)),
    createEmpty: makeRepository,
  };
  openPersonalStore = () => act(async () => open(personalRepository));
}

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

function summaryTree(
  actions: RoundAction[],
  feedback: ReturnType<typeof createMockFeedback>,
  { screenKey = 0, showScreen = true } = {},
) {
  return (
    <FeedbackContext.Provider value={feedback}>
      <PersonalDataProvider source={personalSource}>
        <RoundProvider>
          <PlayedRound actions={actions}>
            {showScreen ? <RoundSummaryScreen key={screenKey} /> : null}
          </PlayedRound>
        </RoundProvider>
      </PersonalDataProvider>
    </FeedbackContext.Provider>
  );
}

async function renderSummary(actions: RoundAction[] = aBoldest, feedback = createMockFeedback()) {
  const view = await renderThemed(summaryTree(actions, feedback));
  await openPersonalStore();
  return { view, feedback };
}

describe('RoundSummaryScreen', () => {
  beforeEach(prepareEmptyPersonalStore);

  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockDismissTo.mockClear();
    mockCanGoBack = true;
    latestRound = undefined;
  });

  describe('the round complete feedback', () => {
    it('should ask for the round complete feedback once when the summary shows', async () => {
      const { feedback } = await renderSummary();

      expect(feedback.roundComplete).toHaveBeenCalledTimes(1);
    });

    it('should ask for nothing else, since the press feedback is the buttons own', async () => {
      const { feedback } = await renderSummary();

      expect(feedback.tap).not.toHaveBeenCalled();
      expect(feedback.done).not.toHaveBeenCalled();
      expect(feedback.pass).not.toHaveBeenCalled();
    });

    it('should not ask again when the screen renders again with new feedback functions', async () => {
      const { view, feedback } = await renderSummary();
      const laterFeedback = createMockFeedback();

      view.rerender(summaryTree(aBoldest, laterFeedback));

      expect(feedback.roundComplete).toHaveBeenCalledTimes(1);
      expect(laterFeedback.roundComplete).not.toHaveBeenCalled();
    });

    it('should not ask again when the screen mounts again for the same round', async () => {
      const { view, feedback } = await renderSummary();

      view.rerender(summaryTree(aBoldest, feedback, { screenKey: 1 }));
      await act(async () => {});

      expect(feedback.roundComplete).toHaveBeenCalledTimes(1);
    });

    it('should drop the rest of the buzz when the screen is left', async () => {
      const { view, feedback } = await renderSummary();
      expect(feedback.cancelHaptics).not.toHaveBeenCalled();

      view.rerender(summaryTree(aBoldest, feedback, { showScreen: false }));

      expect(feedback.cancelHaptics).toHaveBeenCalled();
    });

    it('should ask for nothing when there is no round to celebrate', async () => {
      const feedback = createMockFeedback();
      await renderThemed(
        <FeedbackContext.Provider value={feedback}>
          <RoundProvider>
            <RoundSummaryScreen />
          </RoundProvider>
        </FeedbackContext.Provider>,
      );

      expect(feedback.roundComplete).not.toHaveBeenCalled();
    });
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

  describe('the cards played', () => {
    const favouriteName = copy.favourite.label;

    it('should list the cards played with a favourite control each, and not the one that was passed', async () => {
      await renderSummary();

      expect(
        screen.getByRole('header', { name: copy.roundSummary.playedHeading }),
      ).toBeOnTheScreen();
      expect(screen.getAllByRole('switch', { name: favouriteName })).toHaveLength(2);
    });

    it('should keep the card text from the deck the round started from', async () => {
      await renderSummary();

      screen.getAllByRole('switch', { name: favouriteName }).forEach((control) => {
        const cardText = control.props.accessibilityHint;
        expect(deck.cards.map((card) => card.text)).toContain(cardText);
        expect(screen.getByText(cardText)).toBeOnTheScreen();
      });
    });

    it('should keep a favourite in the repository', async () => {
      await renderSummary();

      const [firstControl] = screen.getAllByRole('switch', { name: favouriteName });
      if (!firstControl) throw new Error('The summary has no favourite control');
      fireEvent.press(firstControl);
      await act(async () => {});

      expect(await personalRepository.listFavourites()).toHaveLength(1);
    });

    it('should put Play again, Settings and Home above the cards', async () => {
      await renderSummary();

      const screenText = JSON.stringify(screen.toJSON());

      expect(screenText.indexOf(copy.roundSummary.playAgain)).toBeLessThan(
        screenText.indexOf(copy.roundSummary.playedHeading),
      );
      expect(screenText.indexOf(copy.roundSummary.home)).toBeLessThan(
        screenText.indexOf(copy.roundSummary.playedHeading),
      );
    });
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
