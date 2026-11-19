/* global jest */
// The native audio and haptics modules do not exist under Jest, and importing them throws. Every
// test gets these stand-ins, which do nothing. A test that checks what was asked of them replaces
// them with its own mock.
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ seekTo: () => Promise.resolve(), play: () => {} }),
  setAudioModeAsync: () => Promise.resolve(),
}));

// Reanimated needs its native runtime, which Jest does not have. These are the mocks its own Jest
// guide gives. Under the mock an animation jumps to its end value at once and never runs, so a test
// checks what is on the screen and not the frames. The mock has no `useReducedMotion`, so this one
// is a Jest mock that answers false. A test sets it with `jest.mocked(useReducedMotion)`.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: () => Promise.resolve(),
  notificationAsync: () => Promise.resolve(),
  performAndroidHapticsAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: {},
  NotificationFeedbackType: {},
  AndroidHaptics: {},
}));

// The splash screen and the system UI are native modules too. A test that checks what was asked of
// them reads these mocks.
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
}));
