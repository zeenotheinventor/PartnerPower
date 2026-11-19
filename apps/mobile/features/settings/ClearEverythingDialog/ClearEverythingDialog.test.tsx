import { copy } from '@getfreak/content';
import { colorThemes } from '@getfreak/tokens';
import { act, fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo, Modal } from 'react-native';

import type { ClearEverythingResult } from '../../../storage/clearEverything';
import { renderThemed } from '../../../tailwind/renderThemed';
import { ClearEverythingDialog } from './ClearEverythingDialog';

type Deferred = { promise: Promise<ClearEverythingResult>; settle: (ok: boolean) => Promise<void> };

// A clear that finishes when the test says so, so the clearing state can be looked at.
function deferredResult(): Deferred {
  let resolve: (result: ClearEverythingResult) => void = () => {};
  const promise = new Promise<ClearEverythingResult>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return {
    promise,
    settle: (ok) =>
      act(async () => {
        resolve({ ok });
        await promise;
      }),
  };
}

async function renderDialog(clearEverything: () => Promise<ClearEverythingResult>) {
  const onCancel = jest.fn();
  await renderThemed(
    <ClearEverythingDialog clearEverything={clearEverything} onCancel={onCancel} />,
  );
  return { onCancel };
}

const confirmButton = (name: string = copy.clear.confirm) => screen.getByRole('button', { name });
const cancelButton = () => screen.getByRole('button', { name: copy.clear.cancel });

describe('ClearEverythingDialog', () => {
  describe('when it opens', () => {
    it('should ask the question as an alert dialog named by it', async () => {
      await renderDialog(jest.fn());

      expect(screen.getByLabelText(copy.clear.title)).toHaveProp('role', 'alertdialog');
      expect(screen.getByRole('header', { name: copy.clear.title })).toBeOnTheScreen();
      expect(screen.getByText(copy.clear.body)).toBeOnTheScreen();
    });

    it('should list what goes and what stays', async () => {
      await renderDialog(jest.fn());

      expect(screen.getByText(copy.clear.removedLabel)).toBeOnTheScreen();
      expect(screen.getByText(copy.clear.keptLabel)).toBeOnTheScreen();
      [...copy.clear.removed, ...copy.clear.kept].forEach((line) =>
        expect(screen.getByText(line)).toBeOnTheScreen(),
      );
    });

    it('should offer a danger button to clear and a cancel button', async () => {
      await renderDialog(jest.fn());

      expect(confirmButton()).toBeOnTheScreen();
      expect(cancelButton()).toBeOnTheScreen();
      expect(screen.getByText(copy.clear.confirm)).toHaveStyle({
        backgroundColor: colorThemes.light.danger.toLowerCase(),
      });
    });

    it('should clear nothing until the player confirms', async () => {
      const clearEverything = jest.fn();
      await renderDialog(clearEverything);

      expect(clearEverything).not.toHaveBeenCalled();
    });

    it('should show no error line', async () => {
      await renderDialog(jest.fn());

      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    });
  });

  describe('cancel', () => {
    it('should close the dialog from the cancel button without clearing', async () => {
      const clearEverything = jest.fn();
      const { onCancel } = await renderDialog(clearEverything);

      fireEvent.press(cancelButton());

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(clearEverything).not.toHaveBeenCalled();
    });

    it('should close the dialog from the Android back button', async () => {
      const { onCancel } = await renderDialog(jest.fn());

      fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('while it clears', () => {
    async function startClearing() {
      const clear = deferredResult();
      const clearEverything = jest.fn(() => clear.promise);
      const { onCancel } = await renderDialog(clearEverything);
      await act(async () => fireEvent.press(confirmButton()));
      return { clear, clearEverything, onCancel };
    }

    it('should clear once, and show the clearing label', async () => {
      const { clearEverything } = await startClearing();

      expect(clearEverything).toHaveBeenCalledTimes(1);
      expect(confirmButton(copy.clear.clearing)).toBeOnTheScreen();
    });

    it('should disable both buttons', async () => {
      await startClearing();

      expect(
        screen.getByRole('button', { name: copy.clear.clearing, disabled: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: copy.clear.cancel, disabled: true }),
      ).toBeOnTheScreen();
    });

    it('should not clear a second time when the disabled button is pressed again', async () => {
      const { clearEverything } = await startClearing();

      fireEvent.press(confirmButton(copy.clear.clearing));

      expect(clearEverything).toHaveBeenCalledTimes(1);
    });

    it('should ignore the Android back button', async () => {
      const { onCancel } = await startClearing();

      fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');

      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should announce that it is clearing', async () => {
      const announce = jest
        .spyOn(AccessibilityInfo, 'announceForAccessibility')
        .mockImplementation(() => {});

      await startClearing();

      expect(announce).toHaveBeenCalledWith(copy.clear.clearing);
      announce.mockRestore();
    });

    it('should stay on the clearing state when it succeeds, because the app starts again', async () => {
      const { clear } = await startClearing();

      await clear.settle(true);

      expect(confirmButton(copy.clear.clearing)).toBeOnTheScreen();
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    });
  });

  describe('when it fails', () => {
    it('should show the error line and offer Try again, with both buttons ready', async () => {
      const clear = deferredResult();
      await renderDialog(jest.fn(() => clear.promise));
      await act(async () => fireEvent.press(confirmButton()));

      await clear.settle(false);

      expect(screen.getByRole('alert')).toHaveTextContent(copy.clear.failed);
      expect(
        screen.getByRole('button', { name: copy.clear.retry, disabled: false }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: copy.clear.cancel, disabled: false }),
      ).toBeOnTheScreen();
    });

    it('should set the error line in the danger colour', async () => {
      const clear = deferredResult();
      await renderDialog(jest.fn(() => clear.promise));
      await act(async () => fireEvent.press(confirmButton()));

      await clear.settle(false);

      expect(screen.getByText(copy.clear.failed)).toHaveStyle({
        color: colorThemes.light.danger.toLowerCase(),
      });
    });

    it('should clear again from Try again, and show the clearing state without the error', async () => {
      const first = deferredResult();
      const second = deferredResult();
      const clearEverything = jest
        .fn<Promise<ClearEverythingResult>, []>()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      await renderDialog(clearEverything);
      await act(async () => fireEvent.press(confirmButton()));
      await first.settle(false);

      await act(async () => fireEvent.press(confirmButton(copy.clear.retry)));

      expect(clearEverything).toHaveBeenCalledTimes(2);
      expect(confirmButton(copy.clear.clearing)).toBeOnTheScreen();
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();

      await second.settle(true);
      expect(confirmButton(copy.clear.clearing)).toBeOnTheScreen();
    });

    it('should land in the failed state when the clear rejects, with Try again and Cancel ready', async () => {
      await renderDialog(jest.fn(() => Promise.reject(new Error('The store is gone.'))));

      await act(async () => fireEvent.press(confirmButton()));

      expect(screen.getByRole('alert')).toHaveTextContent(copy.clear.failed);
      expect(
        screen.getByRole('button', { name: copy.clear.retry, disabled: false }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: copy.clear.cancel, disabled: false }),
      ).toBeOnTheScreen();
    });

    it('should let the player cancel after a failure', async () => {
      const clear = deferredResult();
      const { onCancel } = await renderDialog(jest.fn(() => clear.promise));
      await act(async () => fireEvent.press(confirmButton()));
      await clear.settle(false);

      fireEvent.press(cancelButton());

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
