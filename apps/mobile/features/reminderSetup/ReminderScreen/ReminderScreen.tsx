import { copy } from '@getfreak/content';
import {
  defaultReminder,
  reminderDays,
  reminderHours,
  type ReminderSchedule,
} from '@getfreak/core';
import { useEffect } from 'react';
import { AppState, Linking, Text, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  Header,
  Screen,
  SegmentedControl,
  Toggle,
} from '../../../components/ui';
import { useReminderService, type ReminderState } from '../../../reminder';
import { useGoBack } from '../../settings/useGoBack';
import { useReminderState } from '../useReminderState';

const settingsRoute = '/settings';

const dayChips = reminderDays.map((day, index) => ({
  day,
  label: copy.reminder.days[index] ?? '',
  longName: copy.reminder.daysLong[index] ?? '',
}));

const timeOptions = reminderHours.map((hour, index) => ({
  value: hour,
  label: copy.reminder.times[index] ?? '',
}));

/**
 * The reminder's settings. Turning the switch on is the one place the app asks the phone for
 * permission. With the reminder on, the player picks a day and a time, and each change replaces the
 * reminder, so there is only one. If the phone does not allow notifications, nothing is scheduled
 * and a card says how to allow them. The phone's settings can change while the app is away, so it
 * reads again each time the app comes back. Until the first read, and if the read fails, it shows
 * only its header, so the player can still go back.
 */
export function ReminderScreen() {
  const reminder = useReminderService();
  const goBack = useGoBack(settingsRoute);
  const { state, setState, reload } = useReminderState();

  useEffect(reload, [reload]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') reload();
    });
    return () => subscription.remove();
  }, [reload]);

  // If the phone fails, the screen shows what the reminder really is.
  const apply = async (change: () => Promise<ReminderState>) => {
    try {
      setState(await change());
    } catch {
      reload();
    }
  };

  const turnOn = () => apply(() => reminder.turnOn(defaultReminder));
  const turnOff = () =>
    apply(async () => {
      await reminder.turnOff();
      return { status: 'off' };
    });
  const change = (schedule: ReminderSchedule) => apply(() => reminder.turnOn(schedule));

  if (!state) {
    return (
      <Screen>
        <Header title={copy.reminder.title} backLabel={copy.reminder.backLabel} onBack={goBack} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title={copy.reminder.title} backLabel={copy.reminder.backLabel} onBack={goBack} />
      <Card grouped={false}>
        <Toggle
          label={copy.reminder.toggle}
          description={copy.reminder.toggleCaption}
          value={state.status === 'on'}
          onValueChange={(isOn) => (isOn ? turnOn() : turnOff())}
        />
      </Card>
      {state.status === 'on' ? (
        <>
          <View className="gap-4">
            <Text className="type-caption uppercase text-muted">{copy.reminder.dayLabel}</Text>
            <View className="flex-row flex-wrap gap-8">
              {dayChips.map(({ day, label, longName }) => (
                <Chip
                  key={day}
                  label={label}
                  accessibilityLabel={longName}
                  selected={day === state.schedule.day}
                  onPress={() => change({ day, hour: state.schedule.hour })}
                />
              ))}
            </View>
          </View>
          <SegmentedControl
            label={copy.reminder.timeLabel}
            options={timeOptions}
            value={state.schedule.hour}
            onValueChange={(hour) => change({ day: state.schedule.day, hour })}
          />
          <Card>
            <Text className="type-caption uppercase text-muted">{copy.reminder.previewLabel}</Text>
            <Text className="type-body-bold text-foreground">{copy.notification.body}</Text>
          </Card>
          <Text className="type-caption text-muted">{copy.reminder.nameNote}</Text>
        </>
      ) : null}
      {state.status === 'denied' ? (
        <Card>
          <Text className="type-heading text-foreground">{copy.reminder.deniedTitle}</Text>
          <Text className="type-body text-muted">{copy.reminder.deniedBody}</Text>
          <Text className="type-caption text-muted">{copy.reminder.deniedPath}</Text>
          <Button
            variant="secondary"
            label={copy.reminder.openSettings}
            onPress={() => void Linking.openSettings()}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
