import { render, screen } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { Text } from 'react-native';

import { FontGate } from './FontGate';

jest.mock('expo-font', () => {
  const actual = jest.requireActual<typeof import('expo-font')>('expo-font');
  return { ...actual, useFonts: jest.fn(actual.useFonts) };
});

describe('FontGate', () => {
  it('should show its children only once the fonts are ready', async () => {
    render(
      <FontGate>
        <Text>Ready</Text>
      </FontGate>,
    );

    expect(screen.queryByText('Ready')).not.toBeOnTheScreen();
    expect(await screen.findByText('Ready')).toBeOnTheScreen();
  });

  it('should show its children when the fonts fail to load', () => {
    jest.mocked(useFonts).mockReturnValueOnce([false, new Error('The fonts failed')]);

    render(
      <FontGate>
        <Text>Ready</Text>
      </FontGate>,
    );

    expect(screen.getByText('Ready')).toBeOnTheScreen();
  });
});
