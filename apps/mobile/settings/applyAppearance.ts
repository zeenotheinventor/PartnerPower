import type { Appearance } from '@getfreak/core';
import { colorScheme } from 'nativewind';

/**
 * Makes the app light, dark, or the same as the phone. NativeWind's colour scheme asks React
 * Native's Appearance for the override itself (and for no override, for Match phone), so one call
 * moves the class tokens, `useColorScheme` from React Native, the status bar and the keyboard
 * together. With no override, the phone's own setting applies again, also when it changes while
 * the app is open.
 */
export function applyAppearance(choice: Appearance): void {
  colorScheme.set(choice);
}
