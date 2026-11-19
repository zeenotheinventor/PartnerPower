/* global jest */
// The native audio and haptics modules do not exist under Jest, and importing them throws. Every
// test gets these stand-ins, which do nothing. A test that checks what was asked of them replaces
// them with its own mock.
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ seekTo: () => Promise.resolve(), play: () => {} }),
  setAudioModeAsync: () => Promise.resolve(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: () => Promise.resolve(),
  notificationAsync: () => Promise.resolve(),
  performAndroidHapticsAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: {},
  NotificationFeedbackType: {},
  AndroidHaptics: {},
}));

// Reanimated's own mock runs animations as no-ops, so a component with loops renders and finishes
// at once. It has no reduced motion hook, so one is added. `useReducedMotion` and `withRepeat` are
// jest.fn, so a test can turn reduced motion on or count the loops that were started. The shared
// mock module is changed here, before anything asks for it, and is registered as it is, because the
// router's testing library registers a mock of its own from the same module. The two must be one
// object, so both carry the hook.
const mockReanimated = require('react-native-reanimated/mock');
mockReanimated.useReducedMotion = jest.fn(() => false);
mockReanimated.withRepeat = jest.fn(mockReanimated.withRepeat);
jest.mock('react-native-reanimated', () => mockReanimated);
