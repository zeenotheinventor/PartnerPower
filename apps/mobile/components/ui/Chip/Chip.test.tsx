import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';
import { processColor, StyleSheet } from 'react-native';
import { renderWithMockFeedback } from '../../../feedback/renderWithMockFeedback';

import { renderThemed } from '../../../tailwind/renderThemed';
import { Chip } from './Chip';

const themeNames = ['light', 'dark'] as const;
const categoryIds = ['c1', 'c2', 'c3', 'c4'] as const;

describe('Chip', () => {
  it('should be text named by its label when it is not pressable', async () => {
    await renderThemed(<Chip label="Level 1" />);

    expect(screen.getByRole('text', { name: 'Level 1' })).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('should be a button named by its label when it is pressable', async () => {
    await renderThemed(<Chip label="Level 1" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Level 1' })).toBeOnTheScreen();
  });

  it('should be named by its accessibility label when it has one', async () => {
    await renderThemed(
      <Chip label="Remove" accessibilityLabel="Remove option 3" onPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Remove option 3' })).toBeOnTheScreen();
  });

  it('should call the handler when pressed', async () => {
    const onPress = jest.fn();
    await renderThemed(<Chip label="Level 1" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Level 1' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should expose that it is selected', async () => {
    await renderThemed(<Chip label="Level 1" onPress={jest.fn()} selected />);

    expect(screen.getByRole('button', { name: 'Level 1', selected: true })).toBeOnTheScreen();
  });

  it('should expose that it is not selected', async () => {
    await renderThemed(<Chip label="Level 1" onPress={jest.fn()} selected={false} />);

    expect(screen.getByRole('button', { name: 'Level 1', selected: false })).toBeOnTheScreen();
  });

  it('should set its label in capitals with tracking', async () => {
    await renderThemed(<Chip label="Level 1" />);

    const label = screen.getByText('Level 1');
    expect(label).toHaveStyle({ textTransform: 'uppercase' });
    expect(StyleSheet.flatten(label.props.style).letterSpacing).toBeCloseTo(0.7, 5);
  });

  it('should keep a static chip compact', async () => {
    await renderThemed(<Chip label="Level 1" />);

    expect(screen.getByText('Level 1')).toHaveStyle({ paddingTop: 4, paddingBottom: 4 });
  });

  it('should be tall enough to press when it is a button', async () => {
    await renderThemed(<Chip label="Level 1" onPress={jest.fn()} />);

    // 12 above and below, a 16 line and a 2 border on each side make 44.
    expect(screen.getByRole('button', { name: 'Level 1' })).toHaveStyle({
      paddingTop: 12,
      paddingBottom: 12,
    });
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should draw a neutral chip on the surface in the foreground colour', async () => {
      await renderThemed(<Chip label="Level 1" />, themeName);

      expect(screen.getByText('Level 1')).toHaveStyle({ color: theme.foreground.toLowerCase() });
      expect(screen.getByRole('text', { name: 'Level 1' })).toHaveStyle({
        backgroundColor: theme.surface.toLowerCase(),
      });
    });

    it.each(categoryIds)(
      'should fill a chip with category %s and set its label in the matching colour',
      async (category) => {
        await renderThemed(<Chip label="Level 1" category={category} />, themeName);

        expect(screen.getByRole('text', { name: 'Level 1' })).toHaveStyle({
          backgroundColor: theme.category[category].toLowerCase(),
        });
        expect(screen.getByText('Level 1')).toHaveStyle({
          color: theme.onCategory[category].toLowerCase(),
        });
      },
    );

    it('should fill an accent chip with the accent and set its label in the small label colour', async () => {
      await renderThemed(<Chip label="Level 1" accent />, themeName);

      expect(screen.getByRole('text', { name: 'Level 1' })).toHaveStyle({
        backgroundColor: theme.accent.toLowerCase(),
      });
      expect(screen.getByText('Level 1')).toHaveStyle({ color: theme.onAccentSmall.toLowerCase() });
    });

    it('should outline an unselected category chip with a muted label', async () => {
      await renderThemed(
        <Chip label="Level 1" category="c2" onPress={jest.fn()} selected={false} />,
        themeName,
      );

      const chip = screen.getByRole('button', { name: 'Level 1' });
      // The compiler rewrites the keyword to a fully transparent value, so compare as colours.
      expect(processColor(StyleSheet.flatten(chip.props.style).backgroundColor)).toBe(
        processColor('transparent'),
      );
      expect(chip).toHaveStyle({
        borderColor: theme.border.toLowerCase(),
        borderStyle: 'dashed',
      });
      expect(screen.getByText('Level 1')).toHaveStyle({ color: theme.muted.toLowerCase() });
    });
  });
});

describe('Chip press feedback', () => {
  it('should give the select feedback when pressed', async () => {
    const onPress = jest.fn();
    const feedback = await renderWithMockFeedback(<Chip label="Level 1" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Level 1' }));

    expect(feedback.select).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should give the tap feedback instead when it is told to', async () => {
    const feedback = await renderWithMockFeedback(
      <Chip label="Level 1" feedback="tap" onPress={jest.fn()} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Level 1' }));

    expect(feedback.tap).toHaveBeenCalledTimes(1);
    expect(feedback.select).not.toHaveBeenCalled();
  });
});
