import { copy } from '@getfreak/content';
import { screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { PrivacyCover } from './PrivacyCover';

describe('PrivacyCover', () => {
  it('should say that secret match is hidden, and how to carry on', async () => {
    await renderThemed(<PrivacyCover />);

    expect(screen.getByRole('header', { name: copy.secretMatch.coverTitle })).toBeOnTheScreen();
    expect(screen.getByText(copy.secretMatch.coverBody)).toBeOnTheScreen();
  });

  it('should show Theo covering his eyes, as decoration', async () => {
    await renderThemed(<PrivacyCover />);

    expect(drawnCharacters()).toEqual([
      {
        props: { character: 'shy', mood: 'coverEyes', size: 'hero' },
        isHiddenFromScreenReaders: true,
      },
    ]);
  });
});
