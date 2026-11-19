import { copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Header, Screen, Toggle } from '../../../components/ui';
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
      {/* Not grouped, so each switch is read on its own. */}
      <Card grouped={false}>
        <View className="gap-16">
          <Toggle
            label={copy.settings.soundsLabel}
            description={copy.settings.soundsCaption}
            value={soundOn}
            onValueChange={setSoundOn}
          />
          <View className="border-t-2 border-border pt-16">
            <Toggle
              label={copy.settings.vibrationLabel}
              description={copy.settings.vibrationCaption}
              value={hapticsOn}
              onValueChange={setHapticsOn}
            />
          </View>
        </View>
      </Card>
    </Screen>
  );
}
