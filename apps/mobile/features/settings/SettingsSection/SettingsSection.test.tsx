import { colorThemes } from '@getfreak/tokens';
import { screen } from 'nativewind/test';
import { StyleSheet, Text, View } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { SettingsSection } from './SettingsSection';

// The dividers are the views with only a top border of 2.
function dividerCount() {
  return screen.UNSAFE_getAllByType(View).filter((view) => {
    const style = StyleSheet.flatten(view.props.style);
    return style?.borderTopWidth === 2 && style?.borderWidth === undefined;
  }).length;
}

describe('SettingsSection', () => {
  it('should show the label in the muted colour', async () => {
    await renderThemed(
      <SettingsSection label="Privacy">
        <Text>Row</Text>
      </SettingsSection>,
    );

    expect(screen.getByText('Privacy')).toHaveStyle({
      color: colorThemes.light.muted.toLowerCase(),
    });
  });

  it('should leave the caption out when it has no label', async () => {
    await renderThemed(
      <SettingsSection>
        <Text>Only row</Text>
      </SettingsSection>,
    );

    expect(screen.getByText('Only row')).toBeOnTheScreen();
    expect(screen.queryByText('Privacy')).toBeNull();
  });

  it('should show every row it is given', async () => {
    await renderThemed(
      <SettingsSection label="Privacy">
        <Text>First row</Text>
        <Text>Second row</Text>
      </SettingsSection>,
    );

    expect(screen.getByText('First row')).toBeOnTheScreen();
    expect(screen.getByText('Second row')).toBeOnTheScreen();
  });

  it('should split rows with a divider and put none before the first or after the last', async () => {
    await renderThemed(
      <SettingsSection label="Privacy">
        <Text>First row</Text>
        <Text>Second row</Text>
        <Text>Third row</Text>
      </SettingsSection>,
    );

    expect(dividerCount()).toBe(2);
  });

  it('should have no divider with one row', async () => {
    await renderThemed(
      <SettingsSection label="Privacy">
        <Text>Only row</Text>
      </SettingsSection>,
    );

    expect(dividerCount()).toBe(0);
  });

  it('should skip a row that is not there, so a row can be added only when it applies', async () => {
    await renderThemed(
      <SettingsSection label="Privacy">
        <Text>First row</Text>
        {false}
        <Text>Second row</Text>
      </SettingsSection>,
    );

    expect(dividerCount()).toBe(1);
  });

  it('should leave its rows readable one by one', async () => {
    await renderThemed(
      <SettingsSection label="Privacy">
        <Text>Row</Text>
      </SettingsSection>,
    );

    expect(screen.queryByRole('group')).not.toBeOnTheScreen();
  });
});
