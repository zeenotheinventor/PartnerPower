import { copy } from '@getfreak/content';
import { useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { Button, Header, Screen } from '../../../components/ui';
import type { BiometricsOfferStepProps } from './types';

type Status = 'asking' | 'checking' | 'failed';

/**
 * Offers biometrics on top of the PIN that was just saved. There is no back button, because the PIN
 * is already saved. Using biometrics proves they work first, and a failed check saves nothing and
 * leaves the offer open.
 */
export function BiometricsOfferStep({ kind, onUse, onNotNow }: BiometricsOfferStepProps) {
  const [status, setStatus] = useState<Status>('asking');
  const words = copy.biometrics.kinds[kind];

  const use = async () => {
    setStatus('checking');
    // A check that throws counts as a check that failed.
    const worked = await onUse().catch(() => false);
    if (!worked) {
      setStatus('failed');
      AccessibilityInfo.announceForAccessibility(copy.biometrics.failed);
    }
  };

  return (
    <Screen>
      <Header title={words.title} />
      <View className="flex-1 items-center justify-center gap-16">
        <Text className="type-body max-w-[300px] text-center text-foreground">{words.body}</Text>
        {status === 'failed' ? (
          <Text className="type-body-bold text-center text-danger">{copy.biometrics.failed}</Text>
        ) : null}
      </View>
      <Button
        label={words.yes}
        fullWidth
        disabled={status === 'checking'}
        onPress={() => void use()}
      />
      <Button
        label={copy.biometrics.notNow}
        variant="secondary"
        fullWidth
        disabled={status === 'checking'}
        onPress={onNotNow}
      />
    </Screen>
  );
}
