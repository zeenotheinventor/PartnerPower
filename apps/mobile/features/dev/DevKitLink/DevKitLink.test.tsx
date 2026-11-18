import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { DevKitLink } from './DevKitLink';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('DevKitLink', () => {
  afterEach(() => mockPush.mockClear());

  it('should open the kit gallery when pressed', async () => {
    await renderThemed(<DevKitLink />);

    fireEvent.press(screen.getByRole('button', { name: 'Open the UI kit' }));

    expect(mockPush).toHaveBeenCalledWith('/dev/kit');
  });
});
