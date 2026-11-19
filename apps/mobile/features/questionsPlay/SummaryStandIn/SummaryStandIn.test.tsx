import { copy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { SummaryStandIn } from './SummaryStandIn';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('SummaryStandIn', () => {
  afterEach(() => mockReplace.mockClear());

  it('should show its title as the heading and its line', async () => {
    await renderThemed(<SummaryStandIn />);

    expect(
      screen.getByRole('header', { name: copy.questionsPlay.summaryStandInTitle }),
    ).toBeOnTheScreen();
    expect(screen.getByText(copy.questionsPlay.summaryStandInLine)).toBeOnTheScreen();
  });

  it('should go to the Drink If home from its button', async () => {
    await renderThemed(<SummaryStandIn />);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsPlay.summaryStandInHome }));

    expect(mockReplace).toHaveBeenCalledWith('/games/questions');
  });
});
