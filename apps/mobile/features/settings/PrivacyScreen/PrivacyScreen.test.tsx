import { copy, privacyPolicy } from '@getfreak/content';
import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { PrivacyScreen } from './PrivacyScreen';

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

describe('PrivacyScreen', () => {
  beforeEach(() => {
    mockCanGoBack = true;
    jest.clearAllMocks();
  });

  it('should show the title as the heading, with the date under it', async () => {
    await renderThemed(<PrivacyScreen />);

    expect(screen.getByRole('header', { name: privacyPolicy.title })).toBeOnTheScreen();
    expect(screen.getByText(privacyPolicy.updated)).toBeOnTheScreen();
  });

  it('should show every section as a heading', async () => {
    await renderThemed(<PrivacyScreen />);

    privacyPolicy.sections.forEach((section) =>
      expect(screen.getByRole('header', { name: section.heading })).toBeOnTheScreen(),
    );
  });

  it('should show every paragraph of the policy', async () => {
    await renderThemed(<PrivacyScreen />);

    privacyPolicy.sections.forEach((section) =>
      section.paragraphs.forEach((paragraph) =>
        expect(screen.getByText(paragraph)).toBeOnTheScreen(),
      ),
    );
  });

  it('should set the text in the foreground colour', async () => {
    await renderThemed(<PrivacyScreen />);

    privacyPolicy.sections.forEach((section) =>
      section.paragraphs.forEach((paragraph) =>
        expect(screen.getByText(paragraph)).toHaveStyle({
          color: colorThemes.light.foreground.toLowerCase(),
        }),
      ),
    );
  });

  it('should go back with the back button', async () => {
    await renderThemed(<PrivacyScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.privacy.backLabel }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should go to the settings when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderThemed(<PrivacyScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.privacy.backLabel }));

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/settings');
  });
});
