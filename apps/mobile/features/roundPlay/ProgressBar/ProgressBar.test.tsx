import { screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('should be a progress bar named by its label', async () => {
    await renderThemed(<ProgressBar number={7} length={20} label="Card 7 of 20" />);

    expect(screen.getByRole('progressbar', { name: 'Card 7 of 20' })).toBeOnTheScreen();
  });

  it('should announce how far along it is', async () => {
    await renderThemed(<ProgressBar number={7} length={20} label="Card 7 of 20" />);

    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 0, max: 20, now: 7 });
  });
});
