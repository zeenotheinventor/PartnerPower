import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo, Modal, Text } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { Dialog } from './Dialog';
import type { DialogProps } from './types';

function renderDialog(
  visible = true,
  themeName: 'light' | 'dark' = 'light',
  extra: Partial<DialogProps> = {},
) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const rendered = renderThemed(
    <Dialog
      visible={visible}
      title="Delete this?"
      body="It goes for good."
      confirmLabel="Delete"
      cancelLabel="Keep it"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...extra}
    />,
    themeName,
  );
  return { rendered, onConfirm, onCancel };
}

describe('Dialog', () => {
  it('should show nothing while it is closed', async () => {
    await renderDialog(false).rendered;

    expect(screen.queryByText('Delete this?')).not.toBeOnTheScreen();
  });

  // The panel is not one accessibility element, because that would hide its buttons on iOS. So the
  // role query cannot reach it, and it is found by its label.
  it('should be an alert dialog named by its title', async () => {
    await renderDialog().rendered;

    const panel = screen.getByLabelText('Delete this?');
    expect(panel).toHaveProp('role', 'alertdialog');
  });

  it('should keep a screen reader inside it, as a modal does', async () => {
    await renderDialog().rendered;

    expect(screen.getByLabelText('Delete this?')).toHaveProp('accessibilityViewIsModal', true);
  });

  it('should show the title as a heading and the line under it', async () => {
    await renderDialog().rendered;

    expect(screen.getByRole('header', { name: 'Delete this?' })).toBeOnTheScreen();
    expect(screen.getByText('It goes for good.')).toBeOnTheScreen();
  });

  it('should confirm from the first button only', async () => {
    const { rendered, onConfirm, onCancel } = renderDialog();
    await rendered;

    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should cancel from the second button only', async () => {
    const { rendered, onConfirm, onCancel } = renderDialog();
    await rendered;

    fireEvent.press(screen.getByRole('button', { name: 'Keep it' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should cancel when the system asks to close it, as the Android back button does', async () => {
    const { rendered, onCancel } = renderDialog();
    await rendered;

    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should offer the confirm button first and cancel second', async () => {
    await renderDialog().rendered;

    const [first, second] = screen.getAllByRole('button');
    expect(first).toHaveTextContent('Delete');
    expect(second).toHaveTextContent('Keep it');
  });

  it('should show what it is given under the line', async () => {
    await renderDialog(true, 'light', { children: <Text>Extra detail</Text> }).rendered;

    expect(screen.getByText('Extra detail')).toBeOnTheScreen();
  });

  it('should confirm with a primary button unless told otherwise', async () => {
    await renderDialog().rendered;

    expect(screen.getByText('Delete')).toHaveStyle({
      backgroundColor: colorThemes.light.accent.toLowerCase(),
    });
  });

  it('should confirm with a danger button when asked', async () => {
    await renderDialog(true, 'light', { confirmVariant: 'danger' }).rendered;

    expect(screen.getByText('Delete')).toHaveStyle({
      backgroundColor: colorThemes.light.danger.toLowerCase(),
    });
  });

  describe('error', () => {
    it('should show no error line by default', async () => {
      await renderDialog().rendered;

      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    });

    it('should show the error in the danger colour, as an alert', async () => {
      await renderDialog(true, 'light', { error: 'That did not work.' }).rendered;

      expect(screen.getByRole('alert')).toHaveTextContent('That did not work.');
      expect(screen.getByText('That did not work.')).toHaveStyle({
        color: colorThemes.light.danger.toLowerCase(),
      });
    });

    it('should announce the error when it appears', async () => {
      const announce = jest
        .spyOn(AccessibilityInfo, 'announceForAccessibility')
        .mockImplementation(() => {});

      await renderDialog(true, 'light', { error: 'That did not work.' }).rendered;

      expect(announce).toHaveBeenCalledWith('That did not work.');
      announce.mockRestore();
    });
  });

  describe('busy', () => {
    it('should disable both buttons', async () => {
      const { rendered, onConfirm, onCancel } = renderDialog(true, 'light', { busy: true });
      await rendered;

      fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.press(screen.getByRole('button', { name: 'Keep it' }));

      expect(screen.getByRole('button', { name: 'Delete', disabled: true })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Keep it', disabled: true })).toBeOnTheScreen();
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should ignore the Android back button', async () => {
      const { rendered, onCancel } = renderDialog(true, 'light', { busy: true });
      await rendered;

      fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe.each(['light', 'dark'] as const)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should set the title in the foreground colour and the line in the muted colour', async () => {
      await renderDialog(true, themeName).rendered;

      expect(screen.getByRole('header', { name: 'Delete this?' })).toHaveStyle({
        color: theme.foreground.toLowerCase(),
      });
      expect(screen.getByText('It goes for good.')).toHaveStyle({
        color: theme.muted.toLowerCase(),
      });
    });
  });
});
