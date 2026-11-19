import { copy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo } from 'react-native';

import { LockServiceContext, type LockService } from '../../../lock';
import { createTestLock } from '../../../lock/testing/createTestLock';
import { renderThemed } from '../../../tailwind/renderThemed';
import { AppLockScreen } from './AppLockScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

async function renderScreen(lock: LockService) {
  await renderThemed(
    <LockServiceContext.Provider value={lock}>
      <AppLockScreen />
    </LockServiceContext.Provider>,
  );
  await act(async () => {});
}

describe('AppLockScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should open on the explainer when the lock is off', async () => {
    await renderScreen(createTestLock().lock);

    expect(screen.getByText(copy.lockSetup.explainerHeading)).toBeOnTheScreen();
  });

  it('should open on the lock settings when the lock is on', async () => {
    const { lock } = createTestLock();
    await lock.setPin('4821');

    await renderScreen(lock);

    expect(screen.getByText(copy.lockSettings.statusOn)).toBeOnTheScreen();
  });

  it('should pass on that biometrics are on', async () => {
    const { lock } = createTestLock();
    await lock.setPin('4821');
    await lock.setBiometricsChoice(true);

    await renderScreen(lock);

    expect(
      screen.getByRole('switch', { name: copy.biometrics.kinds.faceId.toggleLabel }),
    ).toHaveProp('accessibilityState', expect.objectContaining({ checked: true }));
  });

  it('should show only its header, with a back button, when the lock cannot be read', async () => {
    const { lock } = createTestLock();
    jest.spyOn(lock, 'isLockOn').mockRejectedValue(new Error('Storage is out of reach'));

    await renderScreen(lock);

    expect(screen.getByRole('header', { name: copy.lockSetup.title })).toBeOnTheScreen();
    expect(screen.queryByText(copy.lockSetup.explainerHeading)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.backLabel }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should go back to Settings from the explainer', async () => {
    await renderScreen(createTestLock().lock);

    fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.backLabel }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should go to Settings when there is nothing to go back to, as after a deep link', async () => {
    mockCanGoBack = false;
    await renderScreen(createTestLock().lock);

    fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.backLabel }));

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/settings');
  });
});
