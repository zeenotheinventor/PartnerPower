import { isHiddenFromAccessibility } from '@testing-library/react-native';
import { screen } from 'nativewind/test';
import { View } from 'react-native';

import { Character } from '../components/ui';

/**
 * Every character on the screen, with the props it was given and whether a screen reader skips it.
 * A character is decorative and has no role or name, so a test reads it from the tree.
 */
export function drawnCharacters() {
  return screen.UNSAFE_queryAllByType(Character).map((instance) => {
    const [root] = instance.findAllByType(View);
    if (!root) throw new Error('A character must draw a root view');
    return { props: instance.props, isHiddenFromScreenReaders: isHiddenFromAccessibility(root) };
  });
}
