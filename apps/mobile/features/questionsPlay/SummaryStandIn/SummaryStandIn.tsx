import { copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Header, Screen } from '../../../components/ui';

const homeRoute = '/games/questions';

// A stand-in until the Drink If summary replaces it, so the end of a round has somewhere to go.
export function SummaryStandIn() {
  const router = useRouter();

  return (
    <Screen>
      <Header title={copy.questionsPlay.summaryStandInTitle} />
      <View className="flex-1">
        <Text className="type-body text-muted">{copy.questionsPlay.summaryStandInLine}</Text>
      </View>
      <Button
        label={copy.questionsPlay.summaryStandInHome}
        fullWidth
        onPress={() => router.replace(homeRoute)}
      />
    </Screen>
  );
}
