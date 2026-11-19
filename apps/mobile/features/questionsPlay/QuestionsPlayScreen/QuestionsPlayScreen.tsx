import { copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Header, Screen } from '../../../components/ui';

const setupRoute = '/games/questions/setup';

// A stand-in until the Drink If play ticket replaces it, so Start has somewhere to go.
export function QuestionsPlayScreen() {
  const router = useRouter();

  // A deep link can open this screen with nothing behind it, so it falls back to setup.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(setupRoute));

  return (
    <Screen>
      <Header
        title={copy.questionsPlay.title}
        backLabel={copy.questionsPlay.backLabel}
        onBack={goBack}
      />
      <Text className="type-body text-muted">{copy.questionsPlay.standInLine}</Text>
    </Screen>
  );
}
