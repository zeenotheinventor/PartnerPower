import { copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Header, Screen, Toggle } from '../../../components/ui';
import { useSettings } from '../../../settings';

const hubRoute = '/';

/** The press feedback settings. Each switch is stored on the device as soon as it is changed. */
export function SettingsScreen() {
  const router = useRouter();
  const { soundOn, setSoundOn, hapticsOn, setHapticsOn } = useSettings();

  // A deep link can open this screen with nothing behind it, so it falls back to the hub.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(hubRoute));

  return (
    <Screen scroll>
      <Header title={copy.settings.title} backLabel={copy.settings.backLabel} onBack={goBack} />
      <View className="gap-16">
        <View className="gap-4">
          <Toggle label={copy.settings.soundsLabel} value={soundOn} onValueChange={setSoundOn} />
          <Text className="type-caption text-muted">{copy.settings.soundsCaption}</Text>
        </View>
        <View className="gap-4">
          <Toggle
            label={copy.settings.vibrationLabel}
            value={hapticsOn}
            onValueChange={setHapticsOn}
          />
          <Text className="type-caption text-muted">{copy.settings.vibrationCaption}</Text>
        </View>
      </View>
    </Screen>
  );
}
