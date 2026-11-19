import { copy, fillCopy } from '@getfreak/content';
import { waitFor } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';

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

const comingSoonEntryNames = [copy.questionsHome.discoveriesTitle];

async function renderHome(fixture = makeOwnQuestionsFixture()) {
  await renderThemed(
    <fixture.Providers>
      <QuestionsHomeScreen />
    </fixture.Providers>,
  );
  // The count follows the read of the player's questions.
  await waitFor(() =>
    expect(
      screen.getByRole('button', {
        name: fillCopy(copy.questionsHome.entryLabel, {
          title: copy.questionsHome.ownTitle,
          count: copy.questionsHome.ownNone,
        }),
      }),
    ).toBeOnTheScreen(),
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

  it('should mark exactly the entries that are not on as coming soon', async () => {
    await renderHome();

    expect(screen.getAllByText(copy.hub.comingSoon)).toHaveLength(comingSoonEntryNames.length);
  });

  it('should open Your questions from its entry', async () => {
    await renderHome();

    fireEvent.press(
      screen.getByRole('button', {
        name: fillCopy(copy.questionsHome.entryLabel, {
          title: copy.questionsHome.ownTitle,
          count: copy.questionsHome.ownNone,
        }),
      }),
    );

    expect(mockPush).toHaveBeenCalledWith('/games/questions/my-questions');
  });

  it('should show None yet beside Your questions when nothing is written', async () => {
    await renderHome();

    expect(screen.getByText(copy.questionsHome.ownNone)).toBeOnTheScreen();
  });

  it('should show how many questions are written beside Your questions, in its name too', async () => {
    const fixture = makeOwnQuestionsFixture();
    for (const text of ['Placeholder question 1', 'Placeholder question 2']) {
      await fixture.repository.savePlayerQuestion({
        format: 'ifYou',
        category: 'c1',
        topic: 't1',
        text,
      });
    }
    await renderThemed(
      <fixture.Providers>
        <QuestionsHomeScreen />
      </fixture.Providers>,
    );

    const count = fillCopy(copy.questionsHome.ownCount, { count: 2 });
    expect(
      await screen.findByRole('button', {
        name: fillCopy(copy.questionsHome.entryLabel, {
          title: copy.questionsHome.ownTitle,
          count,
        }),
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText(count)).toBeOnTheScreen();
  });

  it('should name the other entries by their title alone, with no count', async () => {
    await renderHome();

    expect(screen.getByRole('button', { name: copy.questionsHome.playTitle })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: copy.questionsHome.matchTitle })).toBeOnTheScreen();
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
