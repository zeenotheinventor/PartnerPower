import { render } from '@testing-library/react-native';

import TestErrorRoute from '../../app/dev/test-error';
import { TestReportError } from '../../monitoring';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
  useSegments: () => [],
}));

const mockUpdates: { channel: unknown } = { channel: null };
jest.mock('expo-updates', () => ({
  get channel() {
    return mockUpdates.channel;
  },
}));

describe('the test error route', () => {
  beforeEach(() => {
    // React logs a render error to the console. That is expected here.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockRedirect.mockClear();
    mockUpdates.channel = null;
  });

  it('should throw the test error on the preview channel', () => {
    mockUpdates.channel = 'preview';

    expect(() => render(<TestErrorRoute />)).toThrow(TestReportError);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it.each(['production', 'development', null])(
    'should send a build on the %p channel back to the first screen',
    (channel) => {
      mockUpdates.channel = channel;

      render(<TestErrorRoute />);

      expect(mockRedirect).toHaveBeenCalledWith('/');
    },
  );
});
