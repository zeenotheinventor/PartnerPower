import { copy, fillCopy } from '@getfreak/content';
import { summarise } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Header, Screen } from '../../../components/ui';
import { useRound } from '../../round/RoundProvider';

const setupRoute = '/games/dares/setup';

// A stand-in until the full summary is built. It shows each player's dares done and drinks, and a
// way back to setup. Nothing here logs.
export function RoundSummaryScreen() {
  const router = useRouter();
  const { round } = useRound();
  const summary = round ? summarise(round) : undefined;

  const goToSetup = () => (router.canGoBack() ? router.back() : router.replace(setupRoute));

  return (
    <Screen>
      <Header title={copy.roundSummary.title} />
      {summary?.players.map((player, index) => (
        <Card key={index}>
          <View className="gap-4">
            <Text className="type-heading text-foreground">{player.name}</Text>
            <Text className="type-body text-muted">
              {fillCopy(copy.roundSummary.daresDone, { count: player.daresDone })}
            </Text>
            <Text className="type-body text-muted">
              {fillCopy(copy.roundSummary.drinks, { count: player.drinks })}
            </Text>
          </View>
        </Card>
      ))}
      <View className="flex-1" />
      <Button label={copy.roundSummary.backToSetup} fullWidth onPress={goToSetup} />
    </Screen>
  );
}
