import { copy, displayNames } from '@getfreak/content';
import { gameEntries } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Header, Screen } from '../../../components/ui';
import { GameList } from '../GameList';

type DevKitLinkModule = typeof import('../../dev/DevKitLink');

const settingsRoute = '/settings';

const listedGames = gameEntries.map((entry) => ({ ...entry, ...displayNames[entry.id] }));

// The link is required inside the development branch, so Metro drops it from a production bundle.
function renderDevLink() {
  if (__DEV__) {
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const { DevKitLink }: DevKitLinkModule = require('../../dev/DevKitLink');
    return (
      <View className="mt-8">
        <DevKitLink />
      </View>
    );
  }

  return null;
}

export function HubScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <Header title={copy.appName} subtitle={copy.hub.greeting} />
      <GameList games={listedGames} onOpen={(setupRoute) => router.push(setupRoute)} />
      <View className="flex-1" />
      <Button
        label={copy.hub.settings}
        variant="secondary"
        fullWidth
        onPress={() => router.push(settingsRoute)}
      />
      {renderDevLink()}
    </Screen>
  );
}
