import { isTestErrorAllowed, TestReportError } from './testError';

jest.mock('expo-updates', () => ({ channel: null }));

describe('isTestErrorAllowed', () => {
  it('should allow a test error on the preview channel', () => {
    expect(isTestErrorAllowed('preview')).toBe(true);
  });

  it.each(['production', 'development', '', null, undefined, 5])(
    'should not allow a test error when the channel is %p',
    (channel) => {
      expect(isTestErrorAllowed(channel)).toBe(false);
    },
  );

  it('should not allow one when it reads a launch that has no channel', () => {
    expect(isTestErrorAllowed()).toBe(false);
  });
});

describe('TestReportError', () => {
  it('should carry a name of its own, so its report is easy to find', () => {
    expect(new TestReportError().name).toBe('TestReportError');
  });
});
