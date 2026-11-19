import { copy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

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

const comingSoonEntryNames = [copy.questionsHome.discoveriesTitle, copy.questionsHome.ownTitle];

describe('QuestionsHomeScreen', () => {
  afterEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  it('should show the game name as the heading, with its subtitle', async () => {
    await renderThemed(<QuestionsHomeScreen />);

    expect(screen.getByRole('header', { name: copy.questionsHome.title })).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsHome.subtitle)).toBeOnTheScreen();
  });

  it('should show the line from the character as text', async () => {
    await renderThemed(<QuestionsHomeScreen />);

    expect(screen.getByText(copy.questionsHome.theoLine)).toBeOnTheScreen();
  });

  it('should show Theo resting beside his line, as a head the screen readers skip', async () => {
    await renderThemed(<QuestionsHomeScreen />);

    expect(drawnCharacters()).toEqual([
      {
        props: { character: 'shy', mood: 'idle', size: 'tile', crop: 'head' },
        isHiddenFromScreenReaders: true,
      },
    ]);
  });

  it('should show four entries, each with its title and what it is for', async () => {
    await renderThemed(<QuestionsHomeScreen />);

    expect(screen.getByText(copy.questionsHome.playBody)).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsHome.matchBody)).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsHome.discoveriesBody)).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsHome.ownBody)).toBeOnTheScreen();
  });

  it('should open round setup from Play a round', async () => {
    await renderThemed(<QuestionsHomeScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.playTitle }));

    expect(mockPush).toHaveBeenCalledWith('/games/questions/setup');
  });

  it('should open the secret match intro from Secret match', async () => {
    await renderThemed(<QuestionsHomeScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.matchTitle }));

    expect(mockPush).toHaveBeenCalledWith('/games/questions/match');
  });

  it.each(comingSoonEntryNames)(
    'should show %s as coming soon, disabled, and open nothing',
    async (title) => {
      await renderThemed(<QuestionsHomeScreen />);

      const entry = screen.getByRole('button', {
        name: `${title}, ${copy.hub.comingSoon}`,
        disabled: true,
      });
      fireEvent.press(entry);

      expect(mockPush).not.toHaveBeenCalled();
    },
  );

  it('should mark exactly the two entries that are not on as coming soon', async () => {
    await renderThemed(<QuestionsHomeScreen />);

    expect(screen.getAllByText(copy.hub.comingSoon)).toHaveLength(comingSoonEntryNames.length);
  });

  it('should go back with the back button', async () => {
    await renderThemed(<QuestionsHomeScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.backLabel }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('should fall back to the hub when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderThemed(<QuestionsHomeScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.backLabel }));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
