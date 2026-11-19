import { addBreadcrumb, captureException } from '@sentry/react-native';

import { recordRoute } from './recordRoute';
import { reportError } from './reportError';

describe('reportError', () => {
  afterEach(() => jest.clearAllMocks());

  it('should hand the error to the reporting SDK', () => {
    const error = new Error('boom');

    reportError(error);

    expect(captureException).toHaveBeenCalledWith(error);
  });

  it('should not throw when the SDK does', () => {
    jest.mocked(captureException).mockImplementationOnce(() => {
      throw new Error('SDK failure');
    });

    expect(() => reportError(new Error('boom'))).not.toThrow();
  });
});

describe('recordRoute', () => {
  afterEach(() => jest.clearAllMocks());

  it('should record the route as its folder names', () => {
    recordRoute(['games', 'dares', 'play']);

    expect(addBreadcrumb).toHaveBeenCalledWith({
      category: 'navigation',
      data: { to: '/games/dares/play' },
    });
  });

  it('should record the first screen as the root', () => {
    recordRoute([]);

    expect(addBreadcrumb).toHaveBeenCalledWith({ category: 'navigation', data: { to: '/' } });
  });

  it('should not throw when the SDK does', () => {
    jest.mocked(addBreadcrumb).mockImplementationOnce(() => {
      throw new Error('SDK failure');
    });

    expect(() => recordRoute(['settings'])).not.toThrow();
  });
});
