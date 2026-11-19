/* global jest */
// The native audio and haptics modules do not exist under Jest, and importing them throws. Every
// test gets these stand-ins, which do nothing. A test that checks what was asked of them replaces
// them with its own mock.
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ seekTo: () => Promise.resolve(), play: () => {} }),
  setAudioModeAsync: () => Promise.resolve(),
}));

// Reanimated needs its native runtime, which Jest does not have. The worklets get the mock its own
// Jest guide gives, and Reanimated's mock is set up further down. Under the mock an animation jumps
// to its end value at once and never runs, so a test checks what is on the screen and not the frames.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

jest.mock('expo-haptics', () => ({
  impactAsync: () => Promise.resolve(),
  notificationAsync: () => Promise.resolve(),
  performAndroidHapticsAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: {},
  NotificationFeedbackType: {},
  AndroidHaptics: {},
}));

// Reanimated's own mock runs animations as no-ops, so a component with loops renders and finishes
// at once. It has no reduced motion hook, so one is added that answers false, and a test sets it
// with `jest.mocked(useReducedMotion)`. `useReducedMotion` and `withRepeat` are
// jest.fn, so a test can turn reduced motion on or count the loops that were started. The shared
// mock module is changed here, before anything asks for it, and is registered as it is, because the
// router's testing library registers a mock of its own from the same module. The two must be one
// object, so both carry the hook.
const mockReanimated = require('react-native-reanimated/mock');
mockReanimated.useReducedMotion = jest.fn(() => false);
mockReanimated.withRepeat = jest.fn(mockReanimated.withRepeat);
jest.mock('react-native-reanimated', () => mockReanimated);

// The splash screen and the system UI are native modules too. A test that checks what was asked of
// them reads these mocks.
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
}));

// There is no update system under Jest. Every test gets an app that launched from its installed
// build, so no update is announced. A test that needs another launch replaces this with its own mock.
jest.mock('expo-updates', () => ({ isEmbeddedLaunch: true, updateId: null }));
