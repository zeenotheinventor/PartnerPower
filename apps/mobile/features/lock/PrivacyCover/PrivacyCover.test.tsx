import { screen } from 'nativewind/test';
import { Image } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { PrivacyCover } from './PrivacyCover';

describe('PrivacyCover', () => {
  it('should show the app mark alone, with no words and nothing a screen reader can read', async () => {
    await renderThemed(<PrivacyCover />);

    expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
    expect(screen.queryByText(/./)).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.UNSAFE_getByType(Image).props.accessible).toBe(false);
  });

  it('should fill the screen, so nothing of the app shows around the mark', async () => {
    await renderThemed(<PrivacyCover />);

    expect(screen.getByTestId('privacy-cover')).toHaveStyle({ position: 'absolute' });
  });
});
