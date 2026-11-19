import { copy, fillCopy } from '@getfreak/content';
import type { NewDiscovery } from '@getfreak/core';
import { act, fireEvent, screen } from 'nativewind/test';

import { PersonalDataProvider } from '../../../personal';
import type { PersonalDataSource } from '../../../personal';
import { makeInMemoryRepository } from '../../../personal/testing/personalDataWrapper';
import type { PersonalRepository } from '../../../storage';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { renderThemed } from '../../../tailwind/renderThemed';
import { QuestionsHomeScreen } from './QuestionsHomeScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

const comingSoonEntryNames = [copy.questionsHome.ownTitle];

// The default storage runs over an in-memory backend.
jest.mock('expo-sqlite/kv-store', () => {
  const { createInMemoryBackend } = jest.requireActual<
    typeof import('../../../storage/createInMemoryBackend')
  >('../../../storage/createInMemoryBackend');
  return { __esModule: true, default: createInMemoryBackend() };
});

const countName = (count: string) =>
  fillCopy(copy.questionsHome.entryLabel, { title: copy.questionsHome.discoveriesTitle, count });

// Renders over an in-memory personal store that holds the discoveries the test gives it. The store
// opens inside an act, so nothing updates outside one, unless the test keeps it closed.
async function renderHome(discoveries: readonly NewDiscovery[] = [], { isStoreOpen = true } = {}) {
  const repository = makeInMemoryRepository();
  await repository.addDiscoveries(discoveries);
  let open: (opened: PersonalRepository) => void = () => {};
  const source: PersonalDataSource = {
    load: () => new Promise<PersonalRepository>((resolve) => (open = resolve)),
    createEmpty: makeInMemoryRepository,
  };
  await renderThemed(
    <PersonalDataProvider source={source}>
      <QuestionsHomeScreen />
    </PersonalDataProvider>,
  );
  const openStore = () => act(async () => open(repository));
  if (isStoreOpen) await openStore();
  return { openStore };
}

const twoDiscoveries: NewDiscovery[] = [
  { kind: 'match', questionId: 'q-match-01', strength: 'yes' },
  { kind: 'agree', questionId: 'q-either-01', optionId: 'a' },
];

describe('QuestionsHomeScreen', () => {
  afterEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  it('should show the game name as the heading, with its subtitle', async () => {
    await renderHome();

    expect(screen.getByRole('header', { name: copy.questionsHome.title })).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsHome.subtitle)).toBeOnTheScreen();
  });

  it('should show the line from the character as text', async () => {
    await renderHome();

    expect(screen.getByText(copy.questionsHome.theoLine)).toBeOnTheScreen();
  });

  it('should show Theo resting beside his line, as a head the screen readers skip', async () => {
    await renderHome();

    expect(drawnCharacters()).toEqual([
      {
        props: { character: 'shy', mood: 'idle', size: 'tile', crop: 'head' },
        isHiddenFromScreenReaders: true,
      },
    ]);
  });

  it('should show four entries, each with its title and what it is for', async () => {
    await renderHome();

    expect(screen.getByText(copy.questionsHome.playBody)).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsHome.matchBody)).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsHome.discoveriesBody)).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsHome.ownBody)).toBeOnTheScreen();
  });

  it('should open round setup from Play a round', async () => {
    await renderHome();

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.playTitle }));

    expect(mockPush).toHaveBeenCalledWith('/games/questions/setup');
  });

  it('should open the secret match intro from Secret match', async () => {
    await renderHome();

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.matchTitle }));

    expect(mockPush).toHaveBeenCalledWith('/games/questions/match');
  });

  it.each(comingSoonEntryNames)(
    'should show %s as coming soon, disabled, and open nothing',
    async (title) => {
      await renderHome();

      const entry = screen.getByRole('button', {
        name: `${title}, ${copy.hub.comingSoon}`,
        disabled: true,
      });
      fireEvent.press(entry);

      expect(mockPush).not.toHaveBeenCalled();
    },
  );

  it('should mark exactly the entry that is not on as coming soon', async () => {
    await renderHome();

    expect(screen.getAllByText(copy.hub.comingSoon)).toHaveLength(comingSoonEntryNames.length);
  });

  it('should open Discoveries from its entry, named with how many are saved', async () => {
    await renderHome(twoDiscoveries);

    fireEvent.press(
      await screen.findByRole('button', {
        name: countName(fillCopy(copy.questionsHome.discoveriesCount, { count: 2 })),
      }),
    );

    expect(mockPush).toHaveBeenCalledWith('/games/questions/discoveries');
  });

  it('should show the count at the end of the Discoveries row', async () => {
    await renderHome(twoDiscoveries);

    expect(
      await screen.findByText(fillCopy(copy.questionsHome.discoveriesCount, { count: 2 })),
    ).toBeOnTheScreen();
  });

  it('should say nothing yet when nothing is saved', async () => {
    await renderHome();

    expect(
      await screen.findByRole('button', { name: countName(copy.questionsHome.discoveriesNone) }),
    ).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsHome.discoveriesNone)).toBeOnTheScreen();
  });

  it('should show no count until the discoveries have been read', async () => {
    const { openStore } = await renderHome(twoDiscoveries, { isStoreOpen: false });

    expect(
      screen.getByRole('button', { name: copy.questionsHome.discoveriesTitle }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(copy.questionsHome.discoveriesNone)).not.toBeOnTheScreen();
    await openStore();
  });

  it('should go back with the back button', async () => {
    await renderHome();

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.backLabel }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('should fall back to the hub when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderHome();

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.backLabel }));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
