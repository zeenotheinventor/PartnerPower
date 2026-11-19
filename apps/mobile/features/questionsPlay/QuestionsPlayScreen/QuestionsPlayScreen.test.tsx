import { copy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { QuestionsPlayScreen } from './QuestionsPlayScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

describe('QuestionsPlayScreen', () => {
  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  it('should show the stand-in title as the heading and its line', async () => {
    await renderThemed(<QuestionsPlayScreen />);

    expect(screen.getByRole('header', { name: copy.questionsPlay.title })).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsPlay.standInLine)).toBeOnTheScreen();
  });

  it('should go back from the back button', async () => {
    await renderThemed(<QuestionsPlayScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsPlay.backLabel }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should fall back to setup when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderThemed(<QuestionsPlayScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsPlay.backLabel }));

    expect(mockReplace).toHaveBeenCalledWith('/games/questions/setup');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
