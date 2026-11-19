import type { Feedback } from './types';

/** Feedback whose four calls are Jest mocks, for tests that check what a press asked for. */
export function createMockFeedback(): { [Moment in keyof Feedback]: jest.Mock<void, []> } {
  return { tap: jest.fn(), done: jest.fn(), pass: jest.fn(), roundComplete: jest.fn() };
}
