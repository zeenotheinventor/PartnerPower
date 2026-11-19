import { copy } from '@getfreak/content';
import { useEffect, useRef } from 'react';
import { Text } from 'react-native';

import { FeedbackPressable } from '../../../components/ui';
import { useLockService } from '../../../lock';
import { PinEntryStep } from '../PinEntryStep';
import { whileBiometricsPromptIsOpen } from '../useClearOnBackground';
import { useWaitCountdown } from '../useWaitCountdown';
import type { VerifyPinStepProps } from './types';

/**
 * Asks for the current PIN before Change PIN or Turn off. The service checks it, so a wrong PIN
 * counts toward the wait exactly as it does on the lock screen, and a wait that is already running
 * (even from before a restart) shows here. Biometrics work during a wait.
 */
export function VerifyPinStep({
  purpose,
  canUseBiometrics,
  kind,
  onBack,
  onVerified,
}: VerifyPinStepProps) {
  const lock = useLockService();
  const { message, isWaiting, startWait } = useWaitCountdown();

  useEffect(() => {
    let isCurrent = true;
    lock
      .getWaitRemainingMilliseconds()
      .then((remainingMilliseconds) => {
        if (isCurrent && remainingMilliseconds > 0) startWait(remainingMilliseconds);
      })
      .catch(() => {
        // The wait cannot be read, so the first try finds it out.
      });
    return () => {
      isCurrent = false;
    };
  }, [lock, startWait]);

  const checkPin = async (pin: string) => {
    const result = await lock.checkPin(pin);
    switch (result.status) {
      case 'correct':
      case 'lockOff':
        // With no PIN there is nothing to protect, so the player may go on.
        onVerified();
        return undefined;
      case 'wrong':
        return copy.lock.wrong;
      case 'waiting':
        startWait(result.remainingMilliseconds);
        return undefined;
    }
  };

  // One prompt at a time, so a second press while the phone is asking does nothing.
  const isAsking = useRef(false);
  const unlockWithBiometrics = async () => {
    if (isAsking.current) return;
    isAsking.current = true;
    try {
      const isPassed = await whileBiometricsPromptIsOpen(() =>
        lock.askForBiometrics(copy.lock.promptMessage),
      );
      if (isPassed) onVerified();
    } finally {
      isAsking.current = false;
    }
  };

  return (
    <PinEntryStep
      title={copy.lockSettings.currentTitle}
      subtitle={
        purpose === 'change' ? copy.lockSettings.currentForChange : copy.lockSettings.currentForOff
      }
      onBack={onBack}
      onSubmit={checkPin}
      message={message}
      disabled={isWaiting}
      below={
        canUseBiometrics ? (
          <FeedbackPressable
            accessibilityRole="button"
            onPress={() => void unlockWithBiometrics()}
            className="min-h-48 items-center justify-center"
          >
            <Text className="type-caption text-muted underline">
              {copy.biometrics.kinds[kind].tryAgain}
            </Text>
          </FeedbackPressable>
        ) : undefined
      }
    />
  );
}
