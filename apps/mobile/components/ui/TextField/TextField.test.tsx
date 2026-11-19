import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { TextInput } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { TextField } from './TextField';

const themeNames = ['light', 'dark'] as const;

type RenderedElement = ReturnType<typeof screen.getByLabelText>;

// The box around the input has no role or label, so it is reached from the input it holds.
function boxAround(input: RenderedElement): RenderedElement {
  for (let node = input.parent; node; node = node.parent) {
    if (typeof node.type === 'string') return node;
  }
  throw new Error('The input is not inside a box');
}

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

    fireEvent.press(boxAround(screen.getByLabelText('Name')));

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('should leave the input as the only accessibility element', async () => {
    await renderThemed(<TextField label="Name" value="" onChangeText={jest.fn()} />);

    expect(boxAround(screen.getByLabelText('Name'))).toHaveProp('accessible', false);
  });

  describe('a multiline field', () => {
    it('should accept several lines, starting from the top', async () => {
      await renderThemed(<TextField label="Note" value="" onChangeText={jest.fn()} multiline />);

      expect(screen.getByLabelText('Note')).toHaveProp('multiline', true);
      expect(screen.getByLabelText('Note')).toHaveProp('textAlignVertical', 'top');
    });

    it('should be a single line unless it is asked to be multiline', async () => {
      await renderThemed(<TextField label="Note" value="" onChangeText={jest.fn()} />);

      expect(screen.getByLabelText('Note')).not.toHaveProp('multiline', true);
    });
  });

  describe('the character count', () => {
    it('should show the count against the maximum', async () => {
      await renderThemed(
        <TextField label="Note" value="" onChangeText={jest.fn()} count={23} maxCount={140} />,
      );

      expect(screen.getByText('23/140', { includeHiddenElements: true })).toBeOnTheScreen();
    });

    it('should show no count when it is not given one', async () => {
      await renderThemed(<TextField label="Note" value="" onChangeText={jest.fn()} />);

      expect(screen.queryByText(/\d+\/\d+/, { includeHiddenElements: true })).not.toBeOnTheScreen();
    });

    it('should say the count in words to a screen reader, with the field', async () => {
      await renderThemed(
        <TextField
          label="Note"
          value=""
          onChangeText={jest.fn()}
          count={23}
          maxCount={140}
          countHint="23 of 140 characters"
        />,
      );

      expect(screen.getByLabelText('Note')).toHaveProp('accessibilityHint', '23 of 140 characters');
    });

    it('should keep the written count out of the way of a screen reader, so it is not read twice', async () => {
      await renderThemed(
        <TextField label="Note" value="" onChangeText={jest.fn()} count={23} maxCount={140} />,
      );

      expect(screen.queryByText('23/140')).not.toBeOnTheScreen();
    });
  });

  describe('an error', () => {
    it('should show the message under the field', async () => {
      await renderThemed(
        <TextField label="Note" value="" onChangeText={jest.fn()} error="Write it first." />,
      );

      expect(
        screen.getByText('Write it first.', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('should show no message when there is no error', async () => {
      await renderThemed(<TextField label="Note" value="" onChangeText={jest.fn()} />);

      expect(screen.getByLabelText('Note')).not.toHaveProp('accessibilityHint', expect.anything());
    });

    it('should be read with the field, before the count', async () => {
      await renderThemed(
        <TextField
          label="Note"
          value=""
          onChangeText={jest.fn()}
          error="Write it first."
          count={0}
          maxCount={140}
          countHint="0 of 140 characters"
        />,
      );

      expect(screen.getByLabelText('Note')).toHaveProp(
        'accessibilityHint',
        'Write it first. 0 of 140 characters',
      );
    });

    it('should not be read a second time on its own', async () => {
      await renderThemed(
        <TextField label="Note" value="" onChangeText={jest.fn()} error="Write it first." />,
      );

      expect(screen.queryByText('Write it first.')).not.toBeOnTheScreen();
    });
  });

  describe.each(themeNames)('with the device in %s mode, the outline', (themeName) => {
    const theme = colorThemes[themeName];
    const outline = () => boxAround(screen.getByLabelText('Note'));

    it('should rest on the border colour', async () => {
      await renderThemed(<TextField label="Note" value="" onChangeText={jest.fn()} />, themeName);

      expect(outline()).toHaveStyle({ borderColor: theme.border.toLowerCase() });
    });

    it('should take the foreground colour while the field has focus, and give it back after', async () => {
      await renderThemed(<TextField label="Note" value="" onChangeText={jest.fn()} />, themeName);

      fireEvent(screen.getByLabelText('Note'), 'focus');
      expect(outline()).toHaveStyle({ borderColor: theme.foreground.toLowerCase() });

      fireEvent(screen.getByLabelText('Note'), 'blur');
      expect(outline()).toHaveStyle({ borderColor: theme.border.toLowerCase() });
    });

    it('should take the accent colour for an error, even with focus', async () => {
      await renderThemed(
        <TextField label="Note" value="" onChangeText={jest.fn()} error="Write it first." />,
        themeName,
      );

      fireEvent(screen.getByLabelText('Note'), 'focus');

      expect(outline()).toHaveStyle({ borderColor: theme.accent.toLowerCase() });
    });

    it('should take the accent colour when the count is over the maximum', async () => {
      await renderThemed(
        <TextField label="Note" value="" onChangeText={jest.fn()} count={141} maxCount={140} />,
        themeName,
      );

      expect(outline()).toHaveStyle({ borderColor: theme.accent.toLowerCase() });
    });

    it('should set the count in the muted colour, and in the foreground colour when over', async () => {
      const { rerender } = await renderThemed(
        <TextField label="Note" value="" onChangeText={jest.fn()} count={140} maxCount={140} />,
        themeName,
      );
      expect(screen.getByText('140/140', { includeHiddenElements: true })).toHaveStyle({
        color: theme.muted.toLowerCase(),
      });

      rerender(
        <TextField label="Note" value="" onChangeText={jest.fn()} count={141} maxCount={140} />,
      );

      expect(screen.getByText('141/140', { includeHiddenElements: true })).toHaveStyle({
        color: theme.foreground.toLowerCase(),
      });
    });
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
