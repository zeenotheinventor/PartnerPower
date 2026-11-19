import { copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Header, Screen, SettingsRow, Toggle } from '../../../components/ui';
import { useSettings } from '../../../settings';
import { useClearEverything } from '../../../storage/useClearEverything';
import { AppLockRow } from '../../lockSetup/AppLockRow';
import { ReminderRow } from '../../reminderSetup/ReminderRow';
import { ClearEverythingDialog } from '../ClearEverythingDialog';
import { getAppVersionLabel } from '../getAppVersionLabel';
import { SettingsSection } from '../SettingsSection';
import { useGoBack } from '../useGoBack';

const hubRoute = '/';
const privacyRoute = '/privacy';

/**
 * Every setting in one place, in sections. A later ticket adds its row by putting one more child
 * in a section: App lock and Reminder go in Privacy, above the policy. The switches are stored on
 * the device as soon as they are changed.
 */
export function SettingsScreen() {
  const router = useRouter();
  const goBack = useGoBack(hubRoute);
  const { soundOn, setSoundOn, hapticsOn, setHapticsOn } = useSettings();
  const clearEverything = useClearEverything();
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const versionLabel = getAppVersionLabel();

  return (
    <Screen scroll>
      <Header title={copy.settings.title} backLabel={copy.settings.backLabel} onBack={goBack} />
      <SettingsSection label={copy.settings.playSection}>
        <Toggle
          label={copy.settings.soundsLabel}
          description={copy.settings.soundsCaption}
          value={soundOn}
          onValueChange={setSoundOn}
        />
        <Toggle
          label={copy.settings.vibrationLabel}
          description={copy.settings.vibrationCaption}
          value={hapticsOn}
          onValueChange={setHapticsOn}
        />
      </SettingsSection>
      <SettingsSection label={copy.settings.privacySection}>
        <AppLockRow />
        <ReminderRow />
        <SettingsRow label={copy.settings.privacyLabel} onPress={() => router.push(privacyRoute)} />
      </SettingsSection>
      <SettingsSection label={copy.settings.clearSection}>
        <SettingsRow
          label={copy.settings.clearLabel}
          caption={copy.settings.clearCaption}
          tone="danger"
          showChevron={false}
          onPress={() => setIsClearDialogOpen(true)}
        />
      </SettingsSection>
      <View className="flex-1" />
      {versionLabel ? (
        <Text className="type-caption text-center text-muted">{versionLabel}</Text>
      ) : null}
      {isClearDialogOpen ? (
        <ClearEverythingDialog
          clearEverything={clearEverything}
          onCancel={() => setIsClearDialogOpen(false)}
        />
      ) : null}
    </Screen>
  );
}
