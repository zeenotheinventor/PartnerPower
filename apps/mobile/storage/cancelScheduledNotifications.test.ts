import { cancelAllScheduledNotificationsAsync } from 'expo-notifications';

import { cancelScheduledNotifications } from './cancelScheduledNotifications';

jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
}));

describe('cancelScheduledNotifications', () => {
  it('should ask the phone to cancel every scheduled notification', async () => {
    await cancelScheduledNotifications();

    expect(cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('should pass a failure up, so clear everything can report it', async () => {
    jest
      .mocked(cancelAllScheduledNotificationsAsync)
      .mockRejectedValueOnce(new Error('The cancel failed'));

    await expect(cancelScheduledNotifications()).rejects.toThrow('The cancel failed');
  });
});
