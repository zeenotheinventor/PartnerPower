import { copy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { EndRoundDialog } from './EndRoundDialog';

function renderDialog(visible = true) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const rendered = renderThemed(
    <EndRoundDialog visible={visible} onConfirm={onConfirm} onCancel={onCancel} />,
  );
  return { rendered, onConfirm, onCancel };
}

describe('EndRoundDialog', () => {
  it('should show nothing while it is closed', async () => {
    await renderDialog(false).rendered;

    expect(screen.queryByText(copy.roundPlay.endDialogTitle)).not.toBeOnTheScreen();
  });

  it('should ask whether to end the round, as a heading', async () => {
    await renderDialog().rendered;

    expect(screen.getByRole('header', { name: copy.roundPlay.endDialogTitle })).toBeOnTheScreen();
    expect(screen.getByText(copy.roundPlay.endDialogBody)).toBeOnTheScreen();
  });

  it('should confirm from End round', async () => {
    const { rendered, onConfirm, onCancel } = renderDialog();
    await rendered;

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.endDialogConfirm }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should cancel from Keep playing', async () => {
    const { rendered, onConfirm, onCancel } = renderDialog();
    await rendered;

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.endDialogCancel }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should cancel when the system asks to close it, as the Android back button does', async () => {
    const { rendered, onCancel } = renderDialog();
    await rendered;

    fireEvent(screen.getByRole('header', { name: copy.roundPlay.endDialogTitle }), 'requestClose');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
