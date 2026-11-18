import { render, screen } from '@testing-library/react-native';

import { PlaceholderScreen } from './PlaceholderScreen';

describe('PlaceholderScreen', () => {
  it('should show the app name as the heading', () => {
    render(<PlaceholderScreen />);

    expect(screen.getByRole('header', { name: 'PartnerPower' })).toBeOnTheScreen();
  });

  it('should show that the app is coming soon', () => {
    render(<PlaceholderScreen />);

    expect(screen.getByText('Coming soon')).toBeOnTheScreen();
  });
});
