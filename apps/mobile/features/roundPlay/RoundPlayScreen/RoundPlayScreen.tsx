import { categoryNames, copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Header, Screen } from '../../../components/ui';
import { useRound } from '../../round/RoundProvider';

const setupRoute = '/games/dares/setup';

// A stand-in until the turn screen is built. It shows who holds the phone and the category of the
// current card, and says so when the round has no cards. It never shows what a player typed beyond
// their name, and nothing here logs.
export function RoundPlayScreen() {
  const router = useRouter();
  const { round } = useRound();
  const current = round?.current;

  // A deep link can open this screen with nothing behind it, so it falls back to setup.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(setupRoute));

  return (
    <Screen>
      <Header title={copy.roundPlay.title} backLabel={copy.roundPlay.backLabel} onBack={goBack} />
      {round && current ? (
        <View className="gap-4">
          <Text className="type-caption uppercase text-muted">{copy.roundPlay.turnLabel}</Text>
          <Text className="type-heading text-foreground">{round.players[current.player]}</Text>
          <Text className="type-caption uppercase text-muted">{copy.roundPlay.categoryLabel}</Text>
          <Text className="type-heading text-foreground">
            {categoryNames[current.card.category]}
          </Text>
        </View>
      ) : (
        <Text className="type-body text-muted">{copy.roundPlay.noCards}</Text>
      )}
    </Screen>
  );
}
