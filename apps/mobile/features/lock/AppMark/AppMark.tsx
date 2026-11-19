import { Image } from 'react-native';

import markSource from '../../../assets/images/splash-mark-1024.png';
import type { AppMarkProps } from './types';

const sizeClasses = {
  64: 'h-64 w-64',
  120: 'h-[120px] w-[120px]',
  200: 'h-[200px] w-[200px]',
} as const;

/**
 * The two cards of the app mark, with no words, so it never names the app. It is decoration, so a
 * screen reader skips it.
 */
export function AppMark({ size }: AppMarkProps) {
  return (
    <Image
      source={markSource}
      resizeMode="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      className={sizeClasses[size]}
    />
  );
}
