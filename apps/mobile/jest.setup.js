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
