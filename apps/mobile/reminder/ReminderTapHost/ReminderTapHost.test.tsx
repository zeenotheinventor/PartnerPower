import { act, render } from '@testing-library/react-native';

import { createTestReminder } from '../testing/createTestReminder';
import { ReminderServiceContext } from '../ReminderServiceContext';
import { ReminderTapHost } from './ReminderTapHost';

const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ dismissTo: mockDismissTo }),
}));

function renderHost() {
  const test = createTestReminder();
  const view = render(
    <ReminderServiceContext.Provider value={test.reminder}>
      <ReminderTapHost />
    </ReminderServiceContext.Provider>,
  );
  return { ...test, ...view };
}

describe('ReminderTapHost', () => {
  beforeEach(() => mockDismissTo.mockClear());

  it('should open the hub when the reminder is tapped', () => {
    const { open } = renderHost();

    act(() => open());

    expect(mockDismissTo).toHaveBeenCalledWith('/');
  });

  it('should open the hub each time the reminder is tapped', () => {
    const { open } = renderHost();

    act(() => open());
    act(() => open());

    expect(mockDismissTo).toHaveBeenCalledTimes(2);
  });

  it('should do nothing until the reminder is tapped', () => {
    renderHost();

    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('should stop listening when it is removed', () => {
    const { open, unmount, listenerCount } = renderHost();
    expect(listenerCount()).toBe(1);

    unmount();
    open();

    expect(listenerCount()).toBe(0);
    expect(mockDismissTo).not.toHaveBeenCalled();
  });
});
