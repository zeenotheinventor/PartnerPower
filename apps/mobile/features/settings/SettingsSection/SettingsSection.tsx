import { Children, Fragment } from 'react';
import { Text, View } from 'react-native';

import { Card } from '../../../components/ui';
import type { SettingsSectionProps } from './types';

// A caption over a plain card, with each row split from the next by a line. The card is not
// grouped, so a screen reader reads each row on its own. A later ticket adds its row by putting
// one more child in a section.
export function SettingsSection({ label, children }: SettingsSectionProps) {
  const rows = Children.toArray(children);

  return (
    <View className="gap-4">
      <Text className="type-caption uppercase text-muted">{label}</Text>
      <Card grouped={false}>
        <View className="gap-8">
          {rows.map((row, index) => (
            <Fragment key={index}>
              {index > 0 ? <View className="border-t-2 border-border" /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      </Card>
    </View>
  );
}
