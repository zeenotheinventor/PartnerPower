import { render, screen } from '@testing-library/react-native';

import KitRoute from '../../app/dev/kit';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
  useRouter: () => ({ back: jest.fn() }),
}));

// __DEV__ is a read-only global in the type definitions, so it is set through the property.
function setDevelopmentFlag(value: boolean) {
  Object.defineProperty(globalThis, '__DEV__', { value, writable: true, configurable: true });
}

describe('the kit route', () => {
  const developmentFlag = __DEV__;

  afterEach(() => {
    setDevelopmentFlag(developmentFlag);
    mockRedirect.mockClear();
  });

  it('should show the gallery in development', () => {
    render(<KitRoute />);

    expect(screen.getByRole('header', { name: 'UI kit' })).toBeOnTheScreen();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should send a production build back to the first screen', () => {
    setDevelopmentFlag(false);

    render(<KitRoute />);

    expect(screen.queryByRole('header', { name: 'UI kit' })).not.toBeOnTheScreen();
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });
});
