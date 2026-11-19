import { copy, fillCopy } from '@getfreak/content';
import type { NewDiscovery } from '@getfreak/core';
import { waitFor } from '@testing-library/react-native';
import { act, fireEvent, screen } from 'nativewind/test';

import { drawnCharacters } from '../../../testing/drawnCharacters';
import { renderThemed } from '../../../tailwind/renderThemed';
import { makeOwnQuestionsFixture } from '../../ownQuestions/testing/ownQuestionsFixture';
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

// The default storage runs over an in-memory backend.
jest.mock('expo-sqlite/kv-store', () => {
  const { createInMemoryBackend } = jest.requireActual<
    typeof import('../../../storage/createInMemoryBackend')
  >('../../../storage/createInMemoryBackend');
  return { __esModule: true, default: createInMemoryBackend() };
});

const discoveriesName = (count: string) =>
  fillCopy(copy.questionsHome.entryLabel, { title: copy.questionsHome.discoveriesTitle, count });
const ownName = (count: string) =>
  fillCopy(copy.questionsHome.entryLabel, { title: copy.questionsHome.ownTitle, count });

// Two shipped questions for the discoveries to be about.
const twoDiscoveries: NewDiscovery[] = [
  { kind: 'match', questionId: 'shipped-1', strength: 'yes' },
  { kind: 'agree', questionId: 'shipped-2', optionId: 'a' },
];

type RenderOptions = { discoveries?: readonly NewDiscovery[]; writtenQuestions?: number };

// Renders over an in-memory store, once the counts have been read.
async function renderHome({ discoveries = [], writtenQuestions = 0 }: RenderOptions = {}) {
  const fixture = makeOwnQuestionsFixture({ shippedTexts: ['Shipped one', 'Shipped two'] });
  await fixture.repository.addDiscoveries(discoveries);
  for (let index = 1; index <= writtenQuestions; index += 1) {
    await fixture.repository.savePlayerQuestion({
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      text: `Placeholder question ${index}`,
    });
  }
  await renderThemed(
    <fixture.Providers>
      <QuestionsHomeScreen />
    </fixture.Providers>,
  );
  // The counts follow the reads of the store.
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /^Your questions, / })).toBeOnTheScreen(),
  );
}

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

  it('should show no entry as coming soon', async () => {
    await renderHome();

    expect(screen.queryByText(copy.hub.comingSoon)).not.toBeOnTheScreen();
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

  it('should name the entries without a count by their title alone', async () => {
    await renderHome();

    expect(screen.getByRole('button', { name: copy.questionsHome.playTitle })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: copy.questionsHome.matchTitle })).toBeOnTheScreen();
  });

  describe('the Discoveries count', () => {
    it('should open Discoveries from its entry, named with how many are saved', async () => {
      await renderHome({ discoveries: twoDiscoveries });

      fireEvent.press(
        screen.getByRole('button', {
          name: discoveriesName(fillCopy(copy.questionsHome.discoveriesCount, { count: 2 })),
        }),
      );

      expect(mockPush).toHaveBeenCalledWith('/games/questions/discoveries');
    });

    it('should show the count at the end of the Discoveries row', async () => {
      await renderHome({ discoveries: twoDiscoveries });

      expect(
        screen.getByText(fillCopy(copy.questionsHome.discoveriesCount, { count: 2 })),
      ).toBeOnTheScreen();
    });

    it('should say nothing yet when nothing is saved', async () => {
      await renderHome();

      expect(
        screen.getByRole('button', { name: discoveriesName(copy.questionsHome.discoveriesNone) }),
      ).toBeOnTheScreen();
      expect(screen.getByText(copy.questionsHome.discoveriesNone)).toBeOnTheScreen();
    });
  });

  describe('the Your questions count', () => {
    it('should open Your questions from its entry', async () => {
      await renderHome();

      fireEvent.press(screen.getByRole('button', { name: ownName(copy.questionsHome.ownNone) }));

      expect(mockPush).toHaveBeenCalledWith('/games/questions/my-questions');
    });

    it('should show None yet beside Your questions when nothing is written', async () => {
      await renderHome();

      expect(screen.getByText(copy.questionsHome.ownNone)).toBeOnTheScreen();
    });

    it('should show how many questions are written beside Your questions, in its name too', async () => {
      await renderHome({ writtenQuestions: 2 });

      const count = fillCopy(copy.questionsHome.ownCount, { count: 2 });
      expect(screen.getByRole('button', { name: ownName(count) })).toBeOnTheScreen();
      expect(screen.getByText(count)).toBeOnTheScreen();
    });
  });

  it('should show no count until the store has been read', async () => {
    const fixture = makeOwnQuestionsFixture({ holdLoad: true });
    await renderThemed(
      <fixture.Providers>
        <QuestionsHomeScreen />
      </fixture.Providers>,
    );

    expect(
      screen.getByRole('button', { name: copy.questionsHome.discoveriesTitle }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: copy.questionsHome.ownTitle })).toBeOnTheScreen();
    expect(screen.queryByText(copy.questionsHome.discoveriesNone)).not.toBeOnTheScreen();
    expect(screen.queryByText(copy.questionsHome.ownNone)).not.toBeOnTheScreen();
    await act(async () => fixture.releaseLoad());
    await waitFor(() =>
      expect(screen.getByText(copy.questionsHome.discoveriesNone)).toBeOnTheScreen(),
    );
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
