import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';
import { StyleSheet } from 'react-native';

import { renderWithMockFeedback } from '../../../feedback/renderWithMockFeedback';
import { hostViewsInside } from '../../../tailwind/hostViewsInside';
import { renderThemed } from '../../../tailwind/renderThemed';
import { SettingsRow } from './SettingsRow';

const themeNames = ['light', 'dark'] as const;

// The face is the first view inside the button. It carries the highlight and the layout.
function faceOf(row: ReturnType<typeof screen.getByRole>) {
  const [face] = hostViewsInside(row);
  return face;
}

// The chevron is the view drawn with a top and a right border, turned a quarter.
function chevronOf(row: ReturnType<typeof screen.getByRole>) {
  return hostViewsInside(row).find((view) => {
    const style = StyleSheet.flatten(view.props.style);
    return style?.borderTopWidth === 4 && style?.borderRightWidth === 4;
  });
}

describe('SettingsRow', () => {
  it('should be a button named by its label', async () => {
    await renderThemed(<SettingsRow label="Privacy policy" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Privacy policy' })).toBeOnTheScreen();
  });

  it('should be named by its label and its value together', async () => {
    await renderThemed(<SettingsRow label="App lock" value="On, PIN" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'App lock, On, PIN' })).toBeOnTheScreen();
  });

  it('should show the value', async () => {
    await renderThemed(<SettingsRow label="App lock" value="On, PIN" onPress={jest.fn()} />);

    expect(screen.getByText('On, PIN')).toBeOnTheScreen();
  });

  it('should give the caption as the hint and show it, without adding it to the name', async () => {
    await renderThemed(<SettingsRow label="Restore" caption="Get it back." onPress={jest.fn()} />);

    const row = screen.getByRole('button', { name: 'Restore' });
    expect(row.props.accessibilityHint).toBe('Get it back.');
    expect(screen.getByText('Get it back.')).toBeOnTheScreen();
  });

  it('should have no hint without a caption', async () => {
    await renderThemed(<SettingsRow label="Privacy policy" onPress={jest.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Privacy policy' }).props.accessibilityHint,
    ).toBeUndefined();
  });

  it('should call the handler when pressed', async () => {
    const onPress = jest.fn();
    await renderThemed(<SettingsRow label="Privacy policy" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Privacy policy' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call the handler when disabled, and expose that it is disabled', async () => {
    const onPress = jest.fn();
    await renderThemed(<SettingsRow label="Restore" disabled onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Restore', disabled: true }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('should dim itself when disabled', async () => {
    await renderThemed(<SettingsRow label="Restore" disabled onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Restore' })).toHaveStyle({ opacity: 0.5 });
  });

  it('should be at least 48 tall, so it is easy to hit', async () => {
    await renderThemed(<SettingsRow label="Privacy policy" onPress={jest.fn()} />);

    expect(faceOf(screen.getByRole('button', { name: 'Privacy policy' }))).toHaveStyle({
      minHeight: 48,
    });
  });

  it('should highlight the row while it is pressed', async () => {
    await renderThemed(<SettingsRow label="Privacy policy" onPress={jest.fn()} />);
    const row = screen.getByRole('button', { name: 'Privacy policy' });
    const highlight = { backgroundColor: colorThemes.light.background.toLowerCase() };

    expect(faceOf(row)).not.toHaveStyle(highlight);
    fireEvent(row, 'pressIn');
    expect(faceOf(row)).toHaveStyle(highlight);
    fireEvent(row, 'pressOut');
    expect(faceOf(row)).not.toHaveStyle(highlight);
  });

  describe('the chevron', () => {
    it('should show a chevron by default, because the row opens a screen', async () => {
      await renderThemed(<SettingsRow label="Privacy policy" onPress={jest.fn()} />);

      expect(chevronOf(screen.getByRole('button', { name: 'Privacy policy' }))).toBeDefined();
    });

    it('should leave it out when told, for a row that acts in place', async () => {
      await renderThemed(<SettingsRow label="Restore" showChevron={false} onPress={jest.fn()} />);

      expect(chevronOf(screen.getByRole('button', { name: 'Restore' }))).toBeUndefined();
    });
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should set the label in the foreground colour', async () => {
      await renderThemed(<SettingsRow label="Privacy policy" onPress={jest.fn()} />, themeName);

      expect(screen.getByText('Privacy policy')).toHaveStyle({
        color: theme.foreground.toLowerCase(),
      });
    });

    it('should set the label in the danger colour for a danger row', async () => {
      await renderThemed(
        <SettingsRow label="Clear everything" tone="danger" onPress={jest.fn()} />,
        themeName,
      );

      expect(screen.getByText('Clear everything')).toHaveStyle({
        color: theme.danger.toLowerCase(),
      });
    });

    it('should set the value and the caption in the muted colour', async () => {
      await renderThemed(
        <SettingsRow
          label="App lock"
          value="Off"
          caption="Keeps it private."
          onPress={jest.fn()}
        />,
        themeName,
      );

      expect(screen.getByText('Off')).toHaveStyle({ color: theme.muted.toLowerCase() });
      expect(screen.getByText('Keeps it private.')).toHaveStyle({
        color: theme.muted.toLowerCase(),
      });
    });
  });
});

describe('SettingsRow feedback', () => {
  it('should give the tap feedback and run the action when pressed', async () => {
    const onPress = jest.fn();
    const feedback = await renderWithMockFeedback(
      <SettingsRow label="Privacy policy" onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Privacy policy' }));

    expect(feedback.tap).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should give the locked feedback and nothing else when disabled', async () => {
    const onPress = jest.fn();
    const feedback = await renderWithMockFeedback(
      <SettingsRow label="Restore" disabled onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Restore', disabled: true }));

    expect(feedback.locked).toHaveBeenCalledTimes(1);
    expect(feedback.tap).not.toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
