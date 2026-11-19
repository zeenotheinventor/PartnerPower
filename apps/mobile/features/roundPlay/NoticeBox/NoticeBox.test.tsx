import { screen } from 'nativewind/test';
import { AccessibilityInfo } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { NoticeBox } from './NoticeBox';

describe('NoticeBox', () => {
  it('should show its message as a status', async () => {
    await renderThemed(<NoticeBox message="Pass used." />);

    expect(screen.getByRole('status', { name: 'Pass used.' })).toBeOnTheScreen();
  });

  it('should be a polite live region, which Android reads out', async () => {
    await renderThemed(<NoticeBox message="Pass used." />);

    expect(screen.getByRole('status')).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  it('should announce its message once when it appears, which iOS needs', async () => {
    // The jest preset already makes this a mock, so the calls of earlier tests are cleared first.
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    announce.mockClear();

    await renderThemed(<NoticeBox message="Pass used." />);
    screen.rerender(<NoticeBox message="Pass used." />);

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Pass used.');
  });
});
