import { categoryNames, copy } from '@getfreak/content';
import type { Deck, PlayedCard } from '@getfreak/core';
import { act, fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo } from 'react-native';

import { PersonalDataProvider } from '../../../personal';
import type { PersonalDataSource } from '../../../personal';
import type { PersonalRepository } from '../../../storage';
import { createInMemoryPersonalRepository } from '../../../storage/personal/createInMemoryPersonalRepository';
import { renderThemed } from '../../../tailwind/renderThemed';
import { PlayedCards } from './PlayedCards';

const players = ['Player A', 'Player B'] as const;

const deck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [
    { id: 'card-1', category: 'c1', kind: 'solo', text: 'Card 1', source: 'shipped' },
    { id: 'card-2', category: 'c1', kind: 'solo', text: 'Card 2', source: 'shipped' },
    { id: 'card-3', category: 'c2', kind: 'together', text: 'Card 3', source: 'shipped' },
    { id: 'card-4', category: 'c2', kind: 'solo', text: 'Card 4', source: 'shipped' },
    { id: 'card-5', category: 'c2', kind: 'solo', text: 'Card 5', source: 'shipped' },
  ],
};

const soloDone: PlayedCard = {
  cardId: 'card-1',
  category: 'c1',
  kind: 'solo',
  player: 0,
  outcome: 'done',
};
const soloSkipped: PlayedCard = {
  cardId: 'card-2',
  category: 'c1',
  kind: 'solo',
  player: 1,
  outcome: 'passed',
};
const togetherDone: PlayedCard = {
  cardId: 'card-3',
  category: 'c2',
  kind: 'together',
  player: 1,
  outcome: 'done',
};
const soloFreePass: PlayedCard = {
  cardId: 'card-4',
  category: 'c2',
  kind: 'solo',
  player: 1,
  outcome: 'freePass',
};
const history = [soloDone, soloSkipped, togetherDone, soloFreePass];

const favouriteName = copy.favourite.label;

function makeRepository(): PersonalRepository {
  return createInMemoryPersonalRepository({
    getShippedCards: () => deck.cards,
    randomUUID: () => '00000000-0000-4000-8000-000000000001',
    now: () => 1,
  });
}

// The store opens when the test says so, inside an act, so that nothing updates outside one.
function makeSlowSource(placeholder: PersonalRepository = makeRepository()) {
  let open: (repository: PersonalRepository) => void = () => {};
  const source: PersonalDataSource = {
    load: () => new Promise<PersonalRepository>((resolve) => (open = resolve)),
    createEmpty: () => placeholder,
  };
  return { source, open: (repository: PersonalRepository) => act(async () => open(repository)) };
}

async function renderPlayedCards(
  repository: PersonalRepository = makeRepository(),
  playedHistory: readonly PlayedCard[] = history,
) {
  const { source, open } = makeSlowSource();
  await renderThemed(
    <PersonalDataProvider source={source}>
      <PlayedCards history={playedHistory} deck={deck} players={players} />
    </PersonalDataProvider>,
  );
  await open(repository);
  return repository;
}

// The cards have no role of their own, so a favourite control is found by the card text it carries
// as its hint.
function favouriteOf(cardText: string) {
  const control = screen
    .getAllByRole('switch', { name: favouriteName })
    .find((candidate) => candidate.props.accessibilityHint === cardText);
  if (!control) throw new Error(`No favourite control for ${cardText}`);
  return control;
}

function isFavourite(cardText: string) {
  return favouriteOf(cardText).props.accessibilityState.checked === true;
}

describe('PlayedCards', () => {
  afterEach(() => jest.restoreAllMocks());

  it('should show the heading above the cards', async () => {
    await renderPlayedCards();

    expect(screen.getByRole('header', { name: copy.roundSummary.playedHeading })).toBeOnTheScreen();
  });

  it('should list the cards played in order, with the free pass one and without the skipped one', async () => {
    await renderPlayedCards();

    const controls = screen.getAllByRole('switch', { name: favouriteName });

    expect(controls.map((control) => control.props.accessibilityHint)).toEqual([
      'Card 1',
      'Card 3',
      'Card 4',
    ]);
    expect(screen.getByText('Card 1')).toBeOnTheScreen();
    expect(screen.getByText('Card 3')).toBeOnTheScreen();
    expect(screen.getByText('Card 4')).toBeOnTheScreen();
    expect(screen.queryByText('Card 2')).not.toBeOnTheScreen();
  });

  it('should show the category of each card', async () => {
    await renderPlayedCards();

    expect(screen.getAllByText(categoryNames.c1)).toHaveLength(1);
    expect(screen.getAllByText(categoryNames.c2)).toHaveLength(2);
  });

  it('should name the player who played each solo card', async () => {
    await renderPlayedCards();

    expect(screen.getByText('Player A')).toBeOnTheScreen();
    expect(screen.getByText('Player B')).toBeOnTheScreen();
  });

  it('should mark a together card with the Together chip and name no player for it', async () => {
    await renderPlayedCards(makeRepository(), [togetherDone]);

    expect(screen.getByText(copy.roundPlay.togetherChip)).toBeOnTheScreen();
    expect(screen.queryByText('Player A')).not.toBeOnTheScreen();
    expect(screen.queryByText('Player B')).not.toBeOnTheScreen();
  });

  it('should show nothing when no card was played', async () => {
    await renderPlayedCards(makeRepository(), []);

    expect(screen.queryByRole('header')).not.toBeOnTheScreen();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
  });

  it('should skip a played card that is not in the deck', async () => {
    await renderPlayedCards(makeRepository(), [
      { cardId: 'gone', category: 'c1', kind: 'solo', player: 0, outcome: 'done' },
      soloDone,
    ]);

    expect(screen.getAllByRole('switch', { name: favouriteName })).toHaveLength(1);
  });

  it('should show every control off when nothing is a favourite', async () => {
    await renderPlayedCards();

    expect(isFavourite('Card 1')).toBe(false);
    expect(isFavourite('Card 3')).toBe(false);
    expect(isFavourite('Card 4')).toBe(false);
  });

  it('should show the cards that are already favourites as on', async () => {
    const repository = makeRepository();
    await repository.setFavourite('card-3', true);

    await renderPlayedCards(repository);

    expect(isFavourite('Card 1')).toBe(false);
    expect(isFavourite('Card 3')).toBe(true);
  });

  // The favourites cannot be read, so every control starts off. A write still goes to the store.
  it('should show every control off when the favourites cannot be read', async () => {
    const repository = makeRepository();
    await repository.setFavourite('card-1', true);
    repository.listFavourites = jest.fn().mockRejectedValue(new Error('unreadable'));

    await renderPlayedCards(repository);

    expect(isFavourite('Card 1')).toBe(false);
    expect(screen.getAllByRole('switch', { name: favouriteName })).toHaveLength(3);
  });

  describe('turning a favourite on and off', () => {
    it('should turn the control on and keep the card id in the repository', async () => {
      const repository = await renderPlayedCards();

      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => {});

      expect(isFavourite('Card 1')).toBe(true);
      expect(await repository.listFavourites()).toEqual(['card-1']);
    });

    it('should turn the control on before the write has finished', async () => {
      const repository = makeRepository();
      let finishWrite: () => void = () => {};
      repository.setFavourite = () => new Promise<void>((resolve) => (finishWrite = resolve));
      await renderPlayedCards(repository);

      fireEvent.press(favouriteOf('Card 1'));

      expect(isFavourite('Card 1')).toBe(true);
      await act(async () => finishWrite());
    });

    it('should turn a favourite off and take it out of the repository', async () => {
      const repository = makeRepository();
      await repository.setFavourite('card-1', true);
      await renderPlayedCards(repository);

      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => {});

      expect(isFavourite('Card 1')).toBe(false);
      expect(await repository.listFavourites()).toEqual([]);
    });

    it('should store nothing from the round but the favourite ids', async () => {
      const repository = await renderPlayedCards();

      fireEvent.press(favouriteOf('Card 3'));
      await act(async () => {});

      expect(await repository.listFavourites()).toEqual(['card-3']);
      expect(await repository.listPlayerCards()).toEqual([]);
      expect(await repository.listDecks()).toEqual([]);
    });
  });

  describe('when a write fails', () => {
    function failingRepository() {
      const repository = makeRepository();
      repository.setFavourite = jest.fn().mockRejectedValue(new Error('disk full'));
      return repository;
    }

    it('should put the control back to off and say it did not save', async () => {
      await renderPlayedCards(failingRepository());

      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => {});

      expect(isFavourite('Card 1')).toBe(false);
      expect(
        screen.getByRole('alert', { name: copy.roundSummary.favouriteSaveFailed }),
      ).toBeOnTheScreen();
    });

    it('should put a favourite back to on when turning it off fails', async () => {
      const repository = makeRepository();
      await repository.setFavourite('card-1', true);
      repository.setFavourite = jest.fn().mockRejectedValue(new Error('disk full'));
      await renderPlayedCards(repository);

      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => {});

      expect(isFavourite('Card 1')).toBe(true);
      expect(screen.getByRole('alert')).toBeOnTheScreen();
    });

    it('should announce the message to a screen reader', async () => {
      const announce = jest
        .spyOn(AccessibilityInfo, 'announceForAccessibility')
        .mockImplementation(() => {});
      await renderPlayedCards(failingRepository());

      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => {});

      expect(announce).toHaveBeenCalledWith(copy.roundSummary.favouriteSaveFailed);
    });

    it('should show the message once, for the card that failed last', async () => {
      await renderPlayedCards(failingRepository());

      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => {});
      fireEvent.press(favouriteOf('Card 3'));
      await act(async () => {});

      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });

    it('should end at what the store holds when two quick presses both fail', async () => {
      const repository = makeRepository();
      const rejectWrites: ((reason: Error) => void)[] = [];
      repository.setFavourite = jest.fn(
        () => new Promise<void>((_resolve, reject) => rejectWrites.push(reject)),
      );
      await renderPlayedCards(repository);

      fireEvent.press(favouriteOf('Card 1'));
      fireEvent.press(favouriteOf('Card 1'));
      for (let written = 0; written < 2; written += 1) {
        await act(async () => rejectWrites[written]?.(new Error('disk full')));
      }

      expect(await repository.listFavourites()).toEqual([]);
      expect(isFavourite('Card 1')).toBe(false);
    });

    it('should end at what the store holds when the first of two presses fails and the second saves', async () => {
      const repository = makeRepository();
      await repository.setFavourite('card-1', true);
      const save = repository.setFavourite;
      let failFirst: (reason: Error) => void = () => {};
      repository.setFavourite = jest
        .fn()
        .mockImplementationOnce(() => new Promise<void>((_resolve, reject) => (failFirst = reject)))
        .mockImplementation(save);
      await renderPlayedCards(repository);

      fireEvent.press(favouriteOf('Card 1'));
      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => failFirst(new Error('disk full')));

      expect(await repository.listFavourites()).toEqual(['card-1']);
      expect(isFavourite('Card 1')).toBe(true);
    });

    it('should clear the message when that control next saves', async () => {
      const repository = makeRepository();
      const write = repository.setFavourite;
      repository.setFavourite = jest.fn().mockRejectedValueOnce(new Error('disk full'));
      await renderPlayedCards(repository);
      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => {});
      expect(screen.getByRole('alert')).toBeOnTheScreen();
      repository.setFavourite = write;

      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => {});

      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
      expect(isFavourite('Card 1')).toBe(true);
    });
  });

  describe('while the store is loading', () => {
    it('should not write a favourite until the store has loaded', async () => {
      const placeholder = makeRepository();
      const placeholderWrite = jest.spyOn(placeholder, 'setFavourite');
      const repository = makeRepository();
      const write = jest.spyOn(repository, 'setFavourite');
      const { source, open } = makeSlowSource(placeholder);
      await renderThemed(
        <PersonalDataProvider source={source}>
          <PlayedCards history={history} deck={deck} players={players} />
        </PersonalDataProvider>,
      );

      fireEvent.press(favouriteOf('Card 1'));
      expect(placeholderWrite).not.toHaveBeenCalled();
      expect(isFavourite('Card 1')).toBe(false);

      await open(repository);
      fireEvent.press(favouriteOf('Card 1'));
      await act(async () => {});
      expect(write).toHaveBeenCalledWith('card-1', true);
      expect(placeholderWrite).not.toHaveBeenCalled();
    });
  });
});
