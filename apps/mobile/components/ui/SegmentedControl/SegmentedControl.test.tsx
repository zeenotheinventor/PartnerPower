import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen, within } from 'nativewind/test';
import { renderWithMockFeedback } from '../../../feedback/renderWithMockFeedback';

import { renderThemed } from '../../../tailwind/renderThemed';
import { SegmentedControl } from './SegmentedControl';

const themeNames = ['light', 'dark'] as const;

const levelOptions = [
  { value: 'one', label: 'First' },
  { value: 'two', label: 'Second' },
  { value: 'three', label: 'Third' },
];

function renderControl(onValueChange = jest.fn(), value = 'two') {
  return renderThemed(
    <SegmentedControl
      label="Size"
      options={levelOptions}
      value={value}
      onValueChange={onValueChange}
    />,
  );
}

describe('SegmentedControl', () => {
  // The group is not an accessibility element of its own, so that its radios stay reachable. It
  // carries the radio group role and the name, and so is found by its label.
  it('should hold the radios in a group named by its label', async () => {
    await renderControl();

    const group = screen.getByLabelText('Size');
    expect(group).toHaveProp('accessibilityRole', 'radiogroup');
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
  });

  it('should show one radio for each option, named by its label', async () => {
    await renderControl();

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'First' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Third' })).toBeOnTheScreen();
  });

  it('should show its label as text that a screen reader reads once, before the options', async () => {
    await renderControl();

    expect(screen.getByText('Size')).toBeOnTheScreen();
  });

  it('should expose which option is checked', async () => {
    await renderControl();

    expect(screen.getByRole('radio', { name: 'Second', checked: true })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'First', checked: false })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Third', checked: false })).toBeOnTheScreen();
  });

  it('should check no option while it has no value', async () => {
    await renderThemed(
      <SegmentedControl
        label="Size"
        options={levelOptions}
        value={undefined}
        onValueChange={jest.fn()}
      />,
    );

    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(3);
  });

  it('should report the value of the option that is pressed', async () => {
    const onValueChange = jest.fn();
    await renderControl(onValueChange);

    fireEvent.press(screen.getByRole('radio', { name: 'Third' }));

    expect(onValueChange).toHaveBeenCalledWith('three');
  });

  it('should accept numbers as values', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <SegmentedControl
        label="Length"
        options={[
          { value: 10, label: '10 cards' },
          { value: 20, label: '20 cards' },
        ]}
        value={20}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.press(screen.getByRole('radio', { name: '10 cards' }));

    expect(onValueChange).toHaveBeenCalledWith(10);
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should fill the checked option with the accent colour and a label on the accent', async () => {
      await renderThemed(
        <SegmentedControl
          label="Size"
          options={levelOptions}
          value="two"
          onValueChange={jest.fn()}
        />,
        themeName,
      );

      expect(screen.getByText('Second')).toHaveStyle({
        backgroundColor: theme.accent.toLowerCase(),
        color: theme.onAccent.toLowerCase(),
      });
    });

    it('should set an unchecked option in the muted colour with no fill', async () => {
      await renderThemed(
        <SegmentedControl
          label="Size"
          options={levelOptions}
          value="two"
          onValueChange={jest.fn()}
        />,
        themeName,
      );

      expect(screen.getByText('First')).toHaveStyle({ color: theme.muted.toLowerCase() });
      expect(screen.getByText('First')).not.toHaveStyle({
        backgroundColor: theme.accent.toLowerCase(),
      });
    });
  });
});

describe('SegmentedControl press feedback', () => {
  it('should give the select feedback when an option is chosen', async () => {
    const onValueChange = jest.fn();
    const feedback = await renderWithMockFeedback(
      <SegmentedControl
        label="Size"
        options={levelOptions}
        value="two"
        onValueChange={onValueChange}
      />,
    );

    fireEvent.press(screen.getByRole('radio', { name: 'Third' }));

    expect(feedback.select).toHaveBeenCalledTimes(1);
    expect(feedback.tap).not.toHaveBeenCalled();
    expect(onValueChange).toHaveBeenCalledWith('three');
  });
});
