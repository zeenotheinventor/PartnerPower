import { copy, displayNames } from '@getfreak/content';
import { gameEntries, type GameId } from '@getfreak/core';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Character, Header, Screen, SpeechBubble } from '../../../components/ui';
import { GameList } from '../GameList';

type DevKitLinkModule = typeof import('../../dev/DevKitLink');

const settingsRoute = '/settings';

// Each tile shows the head of the character who fronts its game. Mei deals the dares and Theo fronts
// the questions.
const tileDecorations: Record<GameId, ReactNode> = {
  dares: <Character character="dealer" mood="flirty" size="tile" crop="head" />,
  questions: <Character character="shy" mood="shocked" size="tile" crop="head" />,
};

const listedGames = gameEntries.map((entry) => ({
  ...entry,
  ...displayNames[entry.id],
  decoration: tileDecorations[entry.id],
}));

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
      <Header title={copy.appName} />
      <View className="items-center gap-16">
        <SpeechBubble text={copy.hub.greeting} tail="center" />
        <Character character="host" mood="wave" size="hero" />
      </View>
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
