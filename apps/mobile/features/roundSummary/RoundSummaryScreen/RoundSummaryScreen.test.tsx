import { copy, fillCopy } from '@getfreak/content';
import type { Deck, QuestionDeck, RoundAction, RoundSetup } from '@getfreak/core';
import { act, fireEvent, screen, within } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';

import { customDeckChoice } from '../../decks/customDeckChoice';
import { DeckChoiceProvider, useDeckChoice } from '../../decks/DeckChoiceProvider';
import type { DeckChoice } from '../../decks/types';
import { OwnCardsProvider } from '../../ownCards/OwnCardsProvider';

import { createMockFeedback } from '../../../feedback/createMockFeedback';
import { FeedbackContext } from '../../../feedback/FeedbackProvider';
import { PersonalDataProvider } from '../../../personal';
import type { PersonalDataSource } from '../../../personal';
import type { PersonalRepository } from '../../../storage';
import { createInMemoryPersonalRepository } from '../../../storage/personal/createInMemoryPersonalRepository';
import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
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

const mockDecks: Deck[] = [];
const mockQuestionDecks: QuestionDeck[] = [];
// The decks are read when they are used, because this factory runs before the arrays above exist.
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  const withDecks = Object.defineProperty({ ...actual }, 'decks', {
    get: () => mockDecks,
    enumerable: true,
  });
  return Object.defineProperty(withDecks, 'questionDecks', {
    get: () => mockQuestionDecks,
    enumerable: true,
  });
});

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
    // The first two cards share a tag with the first secret match item, the others with the second.
    tags: [number <= 2 ? 'tag-a' : 'tag-b'],
  })),
};

const secretMatchItem = (id: string, tag: string): QuestionDeck['questions'][number] => ({
  id,
  format: 'secretMatch',
  category: 'c2',
  topic: 't1',
  source: 'shipped',
  text: `Item ${id}`,
  tags: [tag],
});
const matchItems: QuestionDeck = {
  id: 'secretMatch',
  version: 1,
  questions: [secretMatchItem('m-1', 'tag-a'), secretMatchItem('m-2', 'tag-b')],
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
// The deck chosen at setup, which the screen rebuilds a favourites round from.
let chosenDeck: DeckChoice = 'starter';

function ChooseDeck({ children }: { children: ReactNode }) {
  const { chooseDeck } = useDeckChoice();
  useEffect(() => {
    chooseDeck(chosenDeck);
  }, [chooseDeck]);
  return children;
}

function makeRepository(): PersonalRepository {
  return createInMemoryPersonalRepository({
    getShippedCards: () => deck.cards,
    getShippedQuestions: () => [
      { id: 'm-1', optionIds: [] },
      { id: 'm-2', optionIds: [] },
    ],
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
        <OwnCardsProvider>
          <DeckChoiceProvider>
            <ChooseDeck>
              <RoundProvider>
                <PlayedRound actions={actions}>
                  {showScreen ? <RoundSummaryScreen key={screenKey} /> : null}
                </PlayedRound>
              </RoundProvider>
            </ChooseDeck>
          </DeckChoiceProvider>
        </OwnCardsProvider>
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
  beforeEach(() => {
    prepareEmptyPersonalStore();
    mockDecks.splice(0, mockDecks.length, deck);
    mockQuestionDecks.splice(0, mockQuestionDecks.length, matchItems);
    chosenDeck = 'starter';
  });

  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockDismissTo.mockClear();
    mockCanGoBack = true;
    latestRound = undefined;
    chosenDeck = 'starter';
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
          <PersonalDataProvider source={personalSource}>
            <OwnCardsProvider>
              <DeckChoiceProvider>
                <RoundProvider>
                  <RoundSummaryScreen />
                </RoundProvider>
              </DeckChoiceProvider>
            </OwnCardsProvider>
          </PersonalDataProvider>
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

  it('should have a celebrating Tyler say the boldest line, hidden from screen readers', async () => {
    await renderSummary();

    expect(drawnCharacters()).toEqual([
      {
        props: { character: 'hype', mood: 'celebrate', size: 'hero' },
        isHiddenFromScreenReaders: true,
      },
    ]);
  });

  it('should have a shocked Tyler call a tie', async () => {
    await renderSummary(tied);

    expect(drawnCharacters()).toEqual([
      {
        props: { character: 'hype', mood: 'shocked', size: 'hero' },
        isHiddenFromScreenReaders: true,
      },
    ]);
  });

  it.each([
    ['boldest line', aBoldest, fillCopy(copy.roundSummary.boldestLine, { name: 'Player A' })],
    ['tie line', tied, copy.roundSummary.tieLine],
  ])('should announce the %s in a polite live region', async (_name, actions, line) => {
    await renderSummary(actions);

    const liveRegion = screen.UNSAFE_getByProps({ accessibilityLiveRegion: 'polite' });
    expect(within(liveRegion).getByText(line)).toBeOnTheScreen();
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

  describe('Play again from Favourites', () => {
    const dealtIds = () => latestRound?.lastStart?.deck.cards.map((card) => card.id);

    async function playAgainFromFavourites(change: () => Promise<void>) {
      chosenDeck = 'favourites';
      await personalRepository.setFavourite('card-1', true);
      await personalRepository.setFavourite('card-2', true);
      await renderSummary();
      await change();
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));
      });
    }

    it('should deal the favourites as they are now, not as they were when the round started', async () => {
      await playAgainFromFavourites(async () => {
        await personalRepository.setFavourite('card-2', false);
        await personalRepository.setFavourite('card-4', true);
      });

      expect(dealtIds()).toEqual(['card-1', 'card-4']);
    });

    it('should leave out a card that was unfavourited on the summary', async () => {
      await playAgainFromFavourites(() => personalRepository.setFavourite('card-1', false));

      expect(dealtIds()).toEqual(['card-2']);
    });

    it('should bring in a card that was favourited on the summary', async () => {
      await playAgainFromFavourites(() => personalRepository.setFavourite('card-3', true));

      expect(dealtIds()).toEqual(['card-1', 'card-2', 'card-3']);
    });

    it('should not start a round with no cards, and send the player to setup, where the hint says why', async () => {
      await playAgainFromFavourites(async () => {
        await personalRepository.setFavourite('card-1', false);
        await personalRepository.setFavourite('card-2', false);
      });

      expect(latestRound?.lastStart?.deck).toBe(deck);
      expect(latestRound?.lastStart?.setup.seed).toBe(setup.seed);
      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
    });

    it('should let Play again be pressed again after it sent the player to setup', async () => {
      await playAgainFromFavourites(async () => {
        await personalRepository.setFavourite('card-1', false);
        await personalRepository.setFavourite('card-2', false);
      });
      await personalRepository.setFavourite('card-3', true);

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));
      });

      expect(mockReplace).toHaveBeenLastCalledWith('/games/dares/play');
    });

    it('should keep the settings, take a new seed and open play', async () => {
      await playAgainFromFavourites(async () => {});

      expect(latestRound?.lastStart?.setup).toEqual({ ...setup, seed: 99 });
      expect(mockReplace).toHaveBeenCalledWith('/games/dares/play');
    });

    it('should open play only once when pressed twice', async () => {
      chosenDeck = 'favourites';
      await personalRepository.setFavourite('card-1', true);
      await renderSummary();
      const playAgain = screen.getByRole('button', { name: copy.roundSummary.playAgain });

      await act(async () => {
        fireEvent.press(playAgain);
        fireEvent.press(playAgain);
      });

      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
  });

  describe('Play again from Your matches', () => {
    const dealtIds = () => latestRound?.lastStart?.deck.cards.map((card) => card.id);
    const storeMatch = (questionId: string) =>
      personalRepository.addDiscoveries([{ kind: 'match', questionId, strength: 'yes' }]);

    // The deck setup deals from has 8 dares: five tagged for the first item, three for the second.
    beforeEach(() => {
      mockDecks.splice(0, mockDecks.length, {
        id: 'matches-source',
        version: 1,
        cards: Array.from({ length: 8 }, (_, index) => ({
          id: `card-${index + 1}`,
          category: 'c2' as const,
          kind: 'solo' as const,
          text: `Card ${index + 1}`,
          source: 'shipped' as const,
          tags: [index < 5 ? 'tag-a' : 'tag-b'],
        })),
      });
    });

    async function playAgainFromMatches(change: () => Promise<void>) {
      chosenDeck = 'matches';
      await storeMatch('m-1');
      await renderSummary();
      await change();
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));
      });
    }

    it('should deal the matches as they are now, not as they were when the round started', async () => {
      await playAgainFromMatches(() => storeMatch('m-2'));

      expect(dealtIds()).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((number) => `card-${number}`));
      expect(latestRound?.lastStart?.deck.id).toBe('matches');
    });

    it('should deal the dares of the matches that are stored, and no others', async () => {
      await playAgainFromMatches(async () => {});

      expect(dealtIds()).toEqual([1, 2, 3, 4, 5].map((number) => `card-${number}`));
    });

    it('should keep the settings, take a new seed and open play', async () => {
      await playAgainFromMatches(async () => {});

      expect(latestRound?.lastStart?.setup).toEqual({ ...setup, seed: 99 });
      expect(mockReplace).toHaveBeenCalledWith('/games/dares/play');
    });

    it('should not start a round with no cards, and send the player to setup, where it falls back', async () => {
      await playAgainFromMatches(() => personalRepository.clearDiscoveries());

      expect(latestRound?.lastStart?.deck).toBe(deck);
      expect(latestRound?.lastStart?.setup.seed).toBe(setup.seed);
      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
    });

    it('should send the player to setup when the matches have dropped under the floor of 5', async () => {
      // Only the second item is matched, which is 3 dares: under the floor, though in play.
      await playAgainFromMatches(async () => {
        await personalRepository.clearDiscoveries();
        await storeMatch('m-2');
      });

      expect(latestRound?.lastStart?.deck).toBe(deck);
      expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
    });

    it('should send the player to setup when the matches cannot be read', async () => {
      chosenDeck = 'matches';
      await storeMatch('m-1');
      await renderSummary();
      jest.spyOn(personalRepository, 'listDiscoveries').mockRejectedValue(new Error('unreadable'));

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));
      });

      expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
    });
  });

  describe('Play again from a custom deck', () => {
    const dealtIds = () => latestRound?.lastStart?.deck.cards.map((card) => card.id);

    // Stores the deck, chooses it as setup did, and shows the summary with it chosen.
    async function renderWithCustomDeck(cardIds: string[]) {
      const saved = await personalRepository.saveDeck({ name: 'Placeholder deck', cardIds });
      if (!saved.ok) throw new Error('The test deck was not saved');
      chosenDeck = customDeckChoice(saved.saved.id);
      await renderSummary();
      return saved.saved.id;
    }

    const pressPlayAgain = () =>
      act(async () => {
        fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));
      });

    it('should deal the deck as it is stored when Play again is pressed, not as it was', async () => {
      const deckId = await renderWithCustomDeck(['card-1', 'card-2']);
      await personalRepository.saveDeck({
        id: deckId,
        name: 'Placeholder deck',
        cardIds: ['card-2', 'card-4'],
      });

      await pressPlayAgain();

      expect(dealtIds()).toEqual(['card-2', 'card-4']);
      expect(mockReplace).toHaveBeenCalledWith('/games/dares/play');
    });

    it('should deal only the cards of the deck, though the round started from more', async () => {
      await renderWithCustomDeck(['card-3']);

      await pressPlayAgain();

      expect(dealtIds()).toEqual(['card-3']);
    });

    it('should keep the settings and take a new seed', async () => {
      await renderWithCustomDeck(['card-2']);

      await pressPlayAgain();

      expect(latestRound?.lastStart?.setup).toEqual({ ...setup, seed: 99 });
    });

    it('should not start a round when the deck has no cards left in play, and go to setup', async () => {
      const deckId = await renderWithCustomDeck(['card-1']);
      await personalRepository.saveDeck({ id: deckId, name: 'Placeholder deck', cardIds: [] });

      await pressPlayAgain();

      expect(latestRound?.lastStart?.deck).toBe(deck);
      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
    });

    it('should go to setup when the deck has been deleted', async () => {
      const deckId = await renderWithCustomDeck(['card-1']);
      await personalRepository.deleteDeck(deckId);

      await pressPlayAgain();

      expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
    });

    it('should let Play again be pressed again after it sent the player to setup', async () => {
      const deckId = await renderWithCustomDeck(['card-1']);
      await personalRepository.saveDeck({ id: deckId, name: 'Placeholder deck', cardIds: [] });
      await pressPlayAgain();
      await personalRepository.saveDeck({
        id: deckId,
        name: 'Placeholder deck',
        cardIds: ['card-3'],
      });

      await pressPlayAgain();

      expect(mockReplace).toHaveBeenLastCalledWith('/games/dares/play');
      expect(dealtIds()).toEqual(['card-3']);
    });

    it('should open play only once when pressed twice', async () => {
      await renderWithCustomDeck(['card-1']);
      const playAgain = screen.getByRole('button', { name: copy.roundSummary.playAgain });

      await act(async () => {
        fireEvent.press(playAgain);
        fireEvent.press(playAgain);
      });

      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
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
      <PersonalDataProvider source={personalSource}>
        <OwnCardsProvider>
          <DeckChoiceProvider>
            <RoundProvider>
              <RoundSummaryScreen />
            </RoundProvider>
          </DeckChoiceProvider>
        </OwnCardsProvider>
      </PersonalDataProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('group')).toHaveLength(0);
  });
});
