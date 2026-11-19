import type { Feedback } from './types';

/** Feedback whose calls are Jest mocks, for tests that check what a press asked for. */
export function createMockFeedback(): { [Moment in keyof Feedback]: jest.Mock<void, []> } {
  return {
    tap: jest.fn(),
    done: jest.fn(),
    pass: jest.fn(),
    toggleOn: jest.fn(),
    toggleOff: jest.fn(),
    select: jest.fn(),
    back: jest.fn(),
    locked: jest.fn(),
    deal: jest.fn(),
    stepUp: jest.fn(),
    handover: jest.fn(),
    sheetOpen: jest.fn(),
    roundComplete: jest.fn(),
    timerEnd: jest.fn(),
    cancelHaptics: jest.fn(),
    cancelScheduled: jest.fn(),
  };
}
