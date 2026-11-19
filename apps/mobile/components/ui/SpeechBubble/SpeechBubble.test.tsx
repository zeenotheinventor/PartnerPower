import { screen } from 'nativewind/test';
import { useReducedMotion } from 'react-native-reanimated';

import { renderThemed } from '../../../tailwind/renderThemed';
import { SpeechBubble } from './SpeechBubble';

beforeEach(() => {
  jest.mocked(useReducedMotion).mockReturnValue(false);
});

describe('SpeechBubble', () => {
  it('should show its text, which a screen reader reads like any other text', async () => {
    await renderThemed(<SpeechBubble text="Sample line" />);

    expect(screen.getByText('Sample line')).toBeVisible();
  });

  it.each(['left', 'center', 'right'] as const)(
    'should render with its tail on the %s',
    async (tail) => {
      await renderThemed(<SpeechBubble text="Sample line" tail={tail} />);

      expect(screen.getByText('Sample line')).toBeOnTheScreen();
    },
  );

  it('should hold its text while it pops in', async () => {
    await renderThemed(<SpeechBubble text="Sample line" popIn />);

    expect(screen.getByText('Sample line')).toBeOnTheScreen();
  });

  it('should show at once when the player prefers reduced motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);

    await renderThemed(<SpeechBubble text="Sample line" popIn />);

    expect(screen.getByText('Sample line')).toBeVisible();
  });
});
