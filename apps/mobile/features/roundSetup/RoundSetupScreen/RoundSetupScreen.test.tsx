import { copy, displayNames } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { RoundSetupScreen } from './RoundSetupScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));

describe('RoundSetupScreen', () => {
  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  it('should show the title of the game as the heading', async () => {
    await renderThemed(<RoundSetupScreen gameId="dares" />);

    expect(screen.getByRole('header', { name: displayNames.dares.title })).toBeOnTheScreen();
  });

  it('should show the status line', async () => {
    await renderThemed(<RoundSetupScreen gameId="dares" />);

    expect(screen.getByText(copy.roundSetup.status)).toBeOnTheScreen();
  });

  it('should go back when the back button is pressed', async () => {
    await renderThemed(<RoundSetupScreen gameId="dares" />);

    fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.backLabel }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should go to the first screen instead when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderThemed(<RoundSetupScreen gameId="dares" />);

    fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.backLabel }));

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
