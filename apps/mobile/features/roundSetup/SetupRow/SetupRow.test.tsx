import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { SetupRow } from './SetupRow';

describe('SetupRow', () => {
  it('should be a button named by the name it is given', async () => {
    await renderThemed(
      <SetupRow caption="Caption" value="Value" name="Caption, Value" onPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Caption, Value' })).toBeOnTheScreen();
  });

  it('should show the caption and the value', async () => {
    await renderThemed(
      <SetupRow caption="Caption" value="Value" name="Caption, Value" onPress={jest.fn()} />,
    );

    expect(screen.getByText('Caption')).toBeOnTheScreen();
    expect(screen.getByText('Value')).toBeOnTheScreen();
  });

  it('should show no value text while the value is not known', async () => {
    await renderThemed(<SetupRow caption="Caption" name="Caption" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Caption' })).toBeOnTheScreen();
    expect(screen.queryByText('Value')).not.toBeOnTheScreen();
  });

  it('should call the handler when pressed', async () => {
    const onPress = jest.fn();
    await renderThemed(
      <SetupRow caption="Caption" value="Value" name="Caption, Value" onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Caption, Value' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
