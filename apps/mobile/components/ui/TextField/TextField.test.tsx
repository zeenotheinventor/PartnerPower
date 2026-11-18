import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { TextInput } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { TextField } from './TextField';

const themeNames = ['light', 'dark'] as const;

// React Native has no accessibility role for a plain text field, so the field is found by its
// label.
describe('TextField', () => {
  it('should be a text field named by its label', async () => {
    await renderThemed(<TextField label="Name" value="" onChangeText={jest.fn()} />);

    expect(screen.getByLabelText('Name')).toBeOnTheScreen();
  });

  it('should show the value it is given', async () => {
    await renderThemed(<TextField label="Name" value="Sam" onChangeText={jest.fn()} />);

    expect(screen.getByLabelText('Name')).toHaveDisplayValue('Sam');
  });

  it('should report the text as it changes', async () => {
    const onChangeText = jest.fn();
    await renderThemed(<TextField label="Name" value="" onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByLabelText('Name'), 'Alex');

    expect(onChangeText).toHaveBeenCalledWith('Alex');
  });

  it('should show the placeholder', async () => {
    await renderThemed(
      <TextField label="Name" value="" onChangeText={jest.fn()} placeholder="Type a name" />,
    );

    expect(screen.getByPlaceholderText('Type a name')).toBeOnTheScreen();
  });

  it('should limit the length of the text', async () => {
    await renderThemed(<TextField label="Name" value="" onChangeText={jest.fn()} maxLength={12} />);

    expect(screen.getByLabelText('Name')).toHaveProp('maxLength', 12);
  });

  it('should focus the input when the box around it is pressed', async () => {
    await renderThemed(<TextField label="Name" value="" onChangeText={jest.fn()} />);

    // React Native's test double for TextInput records its focus calls on the instance. There is
    // no role or label that reaches the instance, so it is found by type.
    const { instance } = screen.UNSAFE_getByType(TextInput);
    const focus = jest.spyOn(instance, 'focus');

    fireEvent.press(screen.root);

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('should leave the input as the only accessibility element', async () => {
    await renderThemed(<TextField label="Name" value="" onChangeText={jest.fn()} />);

    expect(screen.root).toHaveProp('accessible', false);
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should set the value in the foreground colour and the heading type', async () => {
      await renderThemed(
        <TextField label="Name" value="Sam" onChangeText={jest.fn()} />,
        themeName,
      );

      expect(screen.getByLabelText('Name')).toHaveStyle({
        color: theme.foreground.toLowerCase(),
        fontFamily: 'Baloo2_800ExtraBold',
        fontSize: 20,
      });
    });

    it('should set the placeholder in the muted colour', async () => {
      await renderThemed(
        <TextField label="Name" value="" onChangeText={jest.fn()} placeholder="Type a name" />,
        themeName,
      );

      expect(screen.getByPlaceholderText('Type a name')).toHaveProp(
        'placeholderTextColor',
        theme.muted.toLowerCase(),
      );
    });

    it('should set the label in the muted colour', async () => {
      await renderThemed(<TextField label="Name" value="" onChangeText={jest.fn()} />, themeName);

      expect(screen.getByText('Name', { includeHiddenElements: true })).toHaveStyle({
        color: theme.muted.toLowerCase(),
      });
    });
  });
});
