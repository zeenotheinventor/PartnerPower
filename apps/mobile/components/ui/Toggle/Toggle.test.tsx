import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { hostViewsInside } from '../../../tailwind/hostViewsInside';
import { renderThemed } from '../../../tailwind/renderThemed';
import { Toggle } from './Toggle';

const themeNames = ['light', 'dark'] as const;

function trackAndKnobOf(toggle: ReturnType<typeof screen.getByRole>) {
  // The track and the knob are the last two views, after the one that holds the text.
  const [track, knob] = hostViewsInside(toggle).slice(-2);
  return { track, knob };
}

describe('Toggle', () => {
  it('should be a switch named by its label', async () => {
    await renderThemed(<Toggle label="Sound" value={false} onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Sound' })).toBeOnTheScreen();
  });

  it('should give the description as the hint of the switch and show it', async () => {
    await renderThemed(
      <Toggle label="Sound" description="Button sounds." value onValueChange={jest.fn()} />,
    );

    expect(screen.getByRole('switch', { name: 'Sound' }).props.accessibilityHint).toBe(
      'Button sounds.',
    );
    expect(screen.getByText('Button sounds.')).toBeOnTheScreen();
  });

  it('should set the description in the body type and the muted colour', async () => {
    await renderThemed(
      <Toggle label="Sound" description="Button sounds." value onValueChange={jest.fn()} />,
    );

    expect(screen.getByText('Button sounds.')).toHaveStyle({
      color: colorThemes.light.muted.toLowerCase(),
    });
  });

  it('should have no hint and no extra text without a description', async () => {
    await renderThemed(<Toggle label="Sound" value onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Sound' }).props.accessibilityHint).toBeUndefined();
    expect(screen.getAllByText(/./)).toHaveLength(1);
  });

  it('should expose that it is on', async () => {
    await renderThemed(<Toggle label="Sound" value onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Sound', checked: true })).toBeOnTheScreen();
  });

  it('should expose that it is off', async () => {
    await renderThemed(<Toggle label="Sound" value={false} onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Sound', checked: false })).toBeOnTheScreen();
  });

  it('should show its label as visible text', async () => {
    await renderThemed(<Toggle label="Sound" value onValueChange={jest.fn()} />);

    expect(screen.getByText('Sound')).toBeOnTheScreen();
  });

  it('should report the opposite value when pressed while off', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<Toggle label="Sound" value={false} onValueChange={onValueChange} />);

    fireEvent.press(screen.getByRole('switch', { name: 'Sound' }));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('should report the opposite value when pressed while on', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<Toggle label="Sound" value onValueChange={onValueChange} />);

    fireEvent.press(screen.getByRole('switch', { name: 'Sound' }));

    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('should report a change once when the label is pressed', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<Toggle label="Sound" value={false} onValueChange={onValueChange} />);

    fireEvent.press(screen.getByText('Sound'));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('should not report a change when disabled', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<Toggle label="Sound" value onValueChange={onValueChange} disabled />);

    fireEvent.press(screen.getByRole('switch', { name: 'Sound' }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('should expose the disabled state', async () => {
    await renderThemed(<Toggle label="Sound" value onValueChange={jest.fn()} disabled />);

    expect(screen.getByRole('switch', { name: 'Sound', disabled: true })).toBeOnTheScreen();
  });

  it('should dim the whole row when disabled', async () => {
    await renderThemed(<Toggle label="Sound" value onValueChange={jest.fn()} disabled />);

    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveStyle({ opacity: 0.5 });
  });

  it('should be at least 48 high', async () => {
    await renderThemed(<Toggle label="Sound" value onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveStyle({ minHeight: 48 });
  });

  it('should put the knob at the end of the track when on and at the start when off', async () => {
    await renderThemed(<Toggle label="Sound" value onValueChange={jest.fn()} />);
    expect(trackAndKnobOf(screen.getByRole('switch', { name: 'Sound' })).track).toHaveStyle({
      justifyContent: 'flex-end',
    });

    screen.rerender(<Toggle label="Sound" value={false} onValueChange={jest.fn()} />);
    expect(trackAndKnobOf(screen.getByRole('switch', { name: 'Sound' })).track).toHaveStyle({
      justifyContent: 'flex-start',
    });
  });

  describe('when locked', () => {
    it('should expose the disabled state and stay on', async () => {
      await renderThemed(<Toggle label="Sound" value locked onValueChange={jest.fn()} />);

      expect(
        screen.getByRole('switch', { name: 'Sound', checked: true, disabled: true }),
      ).toBeOnTheScreen();
    });

    it('should carry the hint it is given, so a screen reader says why it does nothing', async () => {
      await renderThemed(
        <Toggle label="Sound" value locked lockedHint="Stays on" onValueChange={jest.fn()} />,
      );

      expect(screen.getByRole('switch', { name: 'Sound' })).toHaveProp(
        'accessibilityHint',
        'Stays on',
      );
    });

    it('should carry the hint instead of the description', async () => {
      await renderThemed(
        <Toggle
          label="Sound"
          description="Button sounds."
          value
          locked
          lockedHint="Stays on"
          onValueChange={jest.fn()}
        />,
      );

      expect(screen.getByRole('switch', { name: 'Sound' })).toHaveProp(
        'accessibilityHint',
        'Stays on',
      );
      expect(screen.getByText('Button sounds.')).toBeOnTheScreen();
    });

    it('should not report a change when pressed', async () => {
      const onValueChange = jest.fn();
      await renderThemed(<Toggle label="Sound" value locked onValueChange={onValueChange} />);

      fireEvent.press(screen.getByRole('switch', { name: 'Sound' }));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('should not be dimmed, so it still reads as the one that is on', async () => {
      await renderThemed(<Toggle label="Sound" value locked onValueChange={jest.fn()} />);

      expect(screen.getByRole('switch', { name: 'Sound' })).not.toHaveStyle({ opacity: 0.5 });
    });

    it('should pick out the track with a foreground border', async () => {
      await renderThemed(<Toggle label="Sound" value locked onValueChange={jest.fn()} />);

      const { track } = trackAndKnobOf(screen.getByRole('switch', { name: 'Sound' }));
      expect(track).toHaveStyle({ borderColor: colorThemes.light.foreground.toLowerCase() });
    });

    it('should keep the track the same size as an unlocked one', async () => {
      await renderThemed(<Toggle label="Sound" value locked onValueChange={jest.fn()} />);

      const { track } = trackAndKnobOf(screen.getByRole('switch', { name: 'Sound' }));
      expect(track).toHaveStyle({ height: 24, width: 40 });
    });
  });

  it('should carry no hint of its own when it is not locked', async () => {
    await renderThemed(
      <Toggle label="Sound" value lockedHint="Stays on" onValueChange={jest.fn()} />,
    );

    expect(screen.getByRole('switch', { name: 'Sound' })).not.toHaveProp('accessibilityHint');
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should set the label in the foreground colour', async () => {
      await renderThemed(<Toggle label="Sound" value onValueChange={jest.fn()} />, themeName);

      expect(screen.getByText('Sound')).toHaveStyle({ color: theme.foreground.toLowerCase() });
    });

    it('should draw an accent track with an on-accent knob when on', async () => {
      await renderThemed(<Toggle label="Sound" value onValueChange={jest.fn()} />, themeName);

      const { track, knob } = trackAndKnobOf(screen.getByRole('switch', { name: 'Sound' }));
      expect(track).toHaveStyle({ backgroundColor: theme.accent.toLowerCase() });
      expect(knob).toHaveStyle({ backgroundColor: theme.onAccent.toLowerCase() });
    });

    it('should draw a border coloured track with a muted knob when off', async () => {
      await renderThemed(
        <Toggle label="Sound" value={false} onValueChange={jest.fn()} />,
        themeName,
      );

      const { track, knob } = trackAndKnobOf(screen.getByRole('switch', { name: 'Sound' }));
      expect(track).toHaveStyle({ backgroundColor: theme.border.toLowerCase() });
      expect(knob).toHaveStyle({ backgroundColor: theme.muted.toLowerCase() });
    });
  });
});
