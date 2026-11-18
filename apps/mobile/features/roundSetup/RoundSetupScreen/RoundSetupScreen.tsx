import { copy, displayNames } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Header, Screen } from '../../../components/ui';
import type { RoundSetupScreenProps } from './types';

// A stand-in so the hub has somewhere to go. The real round setup screen is FRK-11.
export function RoundSetupScreen({ gameId }: RoundSetupScreenProps) {
  const router = useRouter();

  // A deep link can open this screen with nothing behind it, so it falls back to the first screen.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen>
      <Header
        title={displayNames[gameId].title}
        backLabel={copy.roundSetup.backLabel}
        onBack={goBack}
      />
      <Text className="type-body text-muted">{copy.roundSetup.status}</Text>
    </Screen>
  );
}
