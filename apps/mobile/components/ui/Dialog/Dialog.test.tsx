import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';
import { Modal } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { Dialog } from './Dialog';

function renderDialog(visible = true, themeName: 'light' | 'dark' = 'light') {
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
