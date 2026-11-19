import { copy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import type { BiometricsCopyKind } from '../biometricsCopyKind';
import { BiometricsOfferStep } from './BiometricsOfferStep';

const kinds: BiometricsCopyKind[] = [
  'faceId',
  'touchId',
  'fingerprint',
  'faceUnlock',
  'phoneUnlock',
];

async function renderOffer({
  kind = 'faceId',
  onUse = jest.fn(() => Promise.resolve(true)),
  onNotNow = jest.fn(),
}: {
  kind?: BiometricsCopyKind;
  onUse?: () => Promise<boolean>;
  onNotNow?: () => void;
} = {}) {
  await renderThemed(<BiometricsOfferStep kind={kind} onUse={onUse} onNotNow={onNotNow} />);
}

describe('BiometricsOfferStep', () => {
  beforeEach(() => {
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockClear()
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(kinds)('should use the %s words for the title, the body and the button', async (kind) => {
    await renderOffer({ kind });

    const words = copy.biometrics.kinds[kind];
    expect(screen.getByRole('header', { name: words.title })).toBeOnTheScreen();
    expect(screen.getByText(words.body)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: words.yes })).toBeOnTheScreen();
  });

  it('should have no back button, because the PIN is already saved', async () => {
    await renderOffer();

    expect(screen.queryByRole('button', { name: copy.lockSetup.backLabel })).toBeNull();
  });

  it('should leave without biometrics with Not now', async () => {
    const onNotNow = jest.fn();
    const onUse = jest.fn(() => Promise.resolve(true));
    await renderOffer({ onNotNow, onUse });

    fireEvent.press(screen.getByRole('button', { name: copy.biometrics.notNow }));

    expect(onNotNow).toHaveBeenCalledTimes(1);
    expect(onUse).not.toHaveBeenCalled();
  });

  it('should ask for biometrics when the player says yes', async () => {
    const onUse = jest.fn(() => Promise.resolve(true));
    await renderOffer({ onUse });

    fireEvent.press(screen.getByRole('button', { name: copy.biometrics.kinds.faceId.yes }));
    await act(async () => {});

    expect(onUse).toHaveBeenCalledTimes(1);
  });

  it('should disable both buttons while it checks', async () => {
    await renderOffer({ onUse: () => new Promise(() => {}) });

    fireEvent.press(screen.getByRole('button', { name: copy.biometrics.kinds.faceId.yes }));

    expect(
      screen.getByRole('button', { name: copy.biometrics.kinds.faceId.yes, disabled: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: copy.biometrics.notNow, disabled: true }),
    ).toBeOnTheScreen();
  });

  describe('when the check fails', () => {
    it.each([
      ['answers no', () => Promise.resolve(false)],
      ['throws', () => Promise.reject(new Error('The phone failed'))],
    ])('should show the error and stay, when it %s', async (_description, onUse) => {
      await renderOffer({ onUse });

      fireEvent.press(screen.getByRole('button', { name: copy.biometrics.kinds.faceId.yes }));
      await act(async () => {});

      expect(screen.getByText(copy.biometrics.failed)).toBeOnTheScreen();
      expect(
        screen.getByRole('header', { name: copy.biometrics.kinds.faceId.title }),
      ).toBeOnTheScreen();
    });

    it('should announce the error and let the player try again', async () => {
      const onUse = jest.fn(() => Promise.resolve(false));
      await renderOffer({ onUse });
      const yes = () => screen.getByRole('button', { name: copy.biometrics.kinds.faceId.yes });

      fireEvent.press(yes());
      await act(async () => {});
      fireEvent.press(yes());
      await act(async () => {});

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        copy.biometrics.failed,
      );
      expect(onUse).toHaveBeenCalledTimes(2);
    });
  });
});
