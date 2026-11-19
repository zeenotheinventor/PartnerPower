import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { RootRemount } from './RootRemount';
import { useRemountRoot } from './useRemountRoot';

// A child that holds state, to show that a remount throws it away.
function Counter() {
  const [count, setCount] = useState(0);
  const remountRoot = useRemountRoot();
  return (
    <>
      <Text>{`Count ${count}`}</Text>
      <Pressable accessibilityRole="button" onPress={() => setCount(count + 1)}>
        <Text>Add one</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={remountRoot}>
        <Text>Remount</Text>
      </Pressable>
    </>
  );
}

describe('RootRemount', () => {
  it('should show its children', () => {
    render(
      <RootRemount>
        <Counter />
      </RootRemount>,
    );

    expect(screen.getByText('Count 0')).toBeOnTheScreen();
  });

  it('should start every child again from empty state when the root is remounted', async () => {
    const user = userEvent.setup();
    render(
      <RootRemount>
        <Counter />
      </RootRemount>,
    );
    await user.press(screen.getByRole('button', { name: 'Add one' }));
    await user.press(screen.getByRole('button', { name: 'Add one' }));
    expect(screen.getByText('Count 2')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Remount' }));

    expect(screen.getByText('Count 0')).toBeOnTheScreen();
  });

  it('should remount again each time it is asked', async () => {
    const user = userEvent.setup();
    render(
      <RootRemount>
        <Counter />
      </RootRemount>,
    );

    await user.press(screen.getByRole('button', { name: 'Remount' }));
    await user.press(screen.getByRole('button', { name: 'Add one' }));
    await user.press(screen.getByRole('button', { name: 'Remount' }));

    expect(screen.getByText('Count 0')).toBeOnTheScreen();
  });

  it('should fail loudly when the hook is used with no root above it', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Counter />)).toThrow('useRemountRoot needs a RootRemount above it');
    jest.restoreAllMocks();
  });
});
