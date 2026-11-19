import { copy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { DoneStep } from './DoneStep';

describe('DoneStep', () => {
  it('should say the lock is on, and what is needed now', async () => {
    await renderThemed(<DoneStep body={copy.lockSetup.doneBody} onDone={jest.fn()} />);

    expect(screen.getByRole('header', { name: copy.lockSetup.doneTitle })).toBeOnTheScreen();
    expect(screen.getByText(copy.lockSetup.doneBody)).toBeOnTheScreen();
  });

  it('should finish with the Done button', async () => {
    const onDone = jest.fn();
    await renderThemed(<DoneStep body="Body" onDone={onDone} />);

    fireEvent.press(screen.getByRole('button', { name: copy.lockSetup.done }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('should have no back button', async () => {
    await renderThemed(<DoneStep body="Body" onDone={jest.fn()} />);

    expect(screen.queryByRole('button', { name: copy.lockSetup.backLabel })).toBeNull();
  });
});
