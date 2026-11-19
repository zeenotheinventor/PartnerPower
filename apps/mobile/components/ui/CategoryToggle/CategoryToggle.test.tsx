import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';
import { renderWithMockFeedback } from '../../../feedback/renderWithMockFeedback';
import { processColor, StyleSheet } from 'react-native';

import { hostViewsInside } from '../../../tailwind/hostViewsInside';
import { renderThemed } from '../../../tailwind/renderThemed';
import { CategoryToggle } from './CategoryToggle';

const themeNames = ['light', 'dark'] as const;

describe('CategoryToggle', () => {
  it('should be a switch named by its label', async () => {
    await renderThemed(
      <CategoryToggle label="Group" category="c1" value onValueChange={jest.fn()} />,
    );

    expect(screen.getByRole('switch', { name: 'Group' })).toBeOnTheScreen();
  });

  it('should expose that it is on', async () => {
    await renderThemed(
      <CategoryToggle label="Group" category="c1" value onValueChange={jest.fn()} />,
    );

    expect(screen.getByRole('switch', { name: 'Group', checked: true })).toBeOnTheScreen();
  });

  it('should expose that it is off', async () => {
    await renderThemed(
      <CategoryToggle label="Group" category="c1" value={false} onValueChange={jest.fn()} />,
    );

    expect(screen.getByRole('switch', { name: 'Group', checked: false })).toBeOnTheScreen();
  });

  it('should report the opposite value when pressed', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <CategoryToggle label="Group" category="c2" value onValueChange={onValueChange} />,
    );

    fireEvent.press(screen.getByRole('switch', { name: 'Group' }));

    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('should report a change once when the label is pressed', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <CategoryToggle label="Group" category="c2" value={false} onValueChange={onValueChange} />,
    );

    fireEvent.press(screen.getByText('Group'));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('should be at least 48 high', async () => {
    await renderThemed(
      <CategoryToggle label="Group" category="c1" value onValueChange={jest.fn()} />,
    );

    expect(screen.getByRole('switch', { name: 'Group' })).toHaveStyle({ minHeight: 48 });
  });

  it('should carry no hint when it is not locked', async () => {
    await renderThemed(
      <CategoryToggle
        label="Group"
        category="c1"
        value
        lockedHint="Stays on"
        onValueChange={jest.fn()}
      />,
    );

    expect(screen.getByRole('switch', { name: 'Group' })).not.toHaveProp('accessibilityHint');
  });

  describe('when locked', () => {
    it('should expose the disabled state and stay on', async () => {
      await renderThemed(
        <CategoryToggle label="Group" category="c1" value locked onValueChange={jest.fn()} />,
      );

      expect(
        screen.getByRole('switch', { name: 'Group', checked: true, disabled: true }),
      ).toBeOnTheScreen();
    });

    it('should carry the hint it is given, so a screen reader says why it does nothing', async () => {
      await renderThemed(
        <CategoryToggle
          label="Group"
          category="c1"
          value
          locked
          lockedHint="Stays on"
          onValueChange={jest.fn()}
        />,
      );

      expect(screen.getByRole('switch', { name: 'Group' })).toHaveProp(
        'accessibilityHint',
        'Stays on',
      );
    });

    it('should not report a change when pressed', async () => {
      const onValueChange = jest.fn();
      await renderThemed(
        <CategoryToggle label="Group" category="c1" value locked onValueChange={onValueChange} />,
      );

      fireEvent.press(screen.getByRole('switch', { name: 'Group' }));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('should not be dimmed, so it still reads as the one that is on', async () => {
      await renderThemed(
        <CategoryToggle label="Group" category="c1" value locked onValueChange={jest.fn()} />,
      );

      expect(screen.getByRole('switch', { name: 'Group' })).not.toHaveStyle({ opacity: 0.5 });
    });

    it('should be picked out with a foreground border', async () => {
      await renderThemed(
        <CategoryToggle label="Group" category="c1" value locked onValueChange={jest.fn()} />,
      );

      expect(screen.getByRole('switch', { name: 'Group' })).toHaveStyle({
        borderColor: colorThemes.light.foreground.toLowerCase(),
      });
    });
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it.each(['c1', 'c2', 'c3', 'c4'] as const)(
      'should fill the row with the %s colour and set the label on it when on',
      async (category) => {
        await renderThemed(
          <CategoryToggle label="Group" category={category} value onValueChange={jest.fn()} />,
          themeName,
        );

        expect(screen.getByRole('switch', { name: 'Group' })).toHaveStyle({
          backgroundColor: theme.category[category].toLowerCase(),
        });
        expect(screen.getByText('Group')).toHaveStyle({
          color: theme.onCategory[category].toLowerCase(),
        });
      },
    );

    it('should draw a dashed outline with no fill and a muted label when off', async () => {
      await renderThemed(
        <CategoryToggle label="Group" category="c2" value={false} onValueChange={jest.fn()} />,
        themeName,
      );

      const row = screen.getByRole('switch', { name: 'Group' });
      // The compiler rewrites the keyword to a fully transparent value, so compare as colours.
      expect(processColor(StyleSheet.flatten(row.props.style).backgroundColor)).toBe(
        processColor('transparent'),
      );
      expect(row).toHaveStyle({
        borderStyle: 'dashed',
        borderColor: theme.border.toLowerCase(),
      });
      expect(screen.getByText('Group')).toHaveStyle({ color: theme.muted.toLowerCase() });
    });

    it('should put the knob at the end of the track when on and at the start when off', async () => {
      await renderThemed(
        <CategoryToggle label="Group" category="c3" value onValueChange={jest.fn()} />,
        themeName,
      );
      const [onTrack] = hostViewsInside(screen.getByRole('switch', { name: 'Group' }));
      expect(onTrack).toHaveStyle({ justifyContent: 'flex-end' });

      screen.rerender(
        <CategoryToggle label="Group" category="c3" value={false} onValueChange={jest.fn()} />,
      );
      const [offTrack] = hostViewsInside(screen.getByRole('switch', { name: 'Group' }));
      expect(offTrack).toHaveStyle({ justifyContent: 'flex-start' });
    });
  });
});

describe('CategoryToggle press feedback', () => {
  it('should give the toggle on feedback when it is switched on', async () => {
    const onValueChange = jest.fn();
    const feedback = await renderWithMockFeedback(
      <CategoryToggle label="Group" category="c1" value={false} onValueChange={onValueChange} />,
    );

    fireEvent.press(screen.getByRole('switch', { name: 'Group' }));

    expect(feedback.toggleOn).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('should give the toggle off feedback when it is switched off', async () => {
    const feedback = await renderWithMockFeedback(
      <CategoryToggle label="Group" category="c1" value onValueChange={jest.fn()} />,
    );

    fireEvent.press(screen.getByRole('switch', { name: 'Group' }));

    expect(feedback.toggleOff).toHaveBeenCalledTimes(1);
  });

  it('should give the locked feedback and change nothing when the row is locked', async () => {
    const onValueChange = jest.fn();
    const feedback = await renderWithMockFeedback(
      <CategoryToggle label="Group" category="c1" value locked onValueChange={onValueChange} />,
    );

    fireEvent.press(screen.getByRole('switch', { name: 'Group', disabled: true }));

    expect(feedback.locked).toHaveBeenCalledTimes(1);
    expect(feedback.toggleOff).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
