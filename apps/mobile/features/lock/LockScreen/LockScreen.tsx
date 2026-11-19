import { copy, fillCopy } from '@getfreak/content';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { FeedbackPressable } from '../../../components/ui';
import { useLockService } from '../../../lock';
import { useClearEverything } from '../../../storage/useClearEverything';
import { ClearEverythingDialog } from '../../settings/ClearEverythingDialog';
import { biometricsCopyKind } from '../../lockSetup/biometricsCopyKind';
import { PinEntryStep } from '../../lockSetup/PinEntryStep';
import { useLockOverview } from '../../lockSetup/useLockOverview';
import { whileBiometricsPromptIsOpen } from '../../lockSetup/useClearOnBackground';
import { useWaitCountdown } from '../../lockSetup/useWaitCountdown';
import { AppMark } from '../AppMark';
import type { LockScreenProps } from './types';

// From the third wrong PIN in a run, the line says how many tries are left before the wait.
function wrongPinLine(triesLeftBeforeWait: number): string {
  if (triesLeftBeforeWait === 1) return copy.lock.wrongOne;
  if (triesLeftBeforeWait === 2)
    return fillCopy(copy.lock.wrongFew, { count: triesLeftBeforeWait });
  return copy.lock.wrong;
}

/**
 * Asks for the PIN. It is shown only while the app is locked, so each time it appears it shows the
 * biometrics prompt once, if the player turned biometrics on. Cancelling the prompt leaves the
 * keypad and a link to try again. It has no back control and shows nothing of the app. The digits
 * are held by `PinEntryStep`, and they are never logged or stored here.
 */
export function LockScreen({ onUnlock }: LockScreenProps) {
  const lock = useLockService();
  const clearEverything = useClearEverything();
  const { message, isWaiting, startWait } = useWaitCountdown();
  const { overview, reload } = useLockOverview();
  const [isForgotPinOpen, setIsForgotPinOpen] = useState(false);

  // A wait that is already running, even from before a restart, shows as soon as the screen opens.
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

  useEffect(reload, [reload]);

  const canUseBiometrics = Boolean(overview?.isBiometricsOn && overview.availability.isAvailable);
  const kind = overview ? biometricsCopyKind(overview.availability, Platform.OS) : 'phoneUnlock';

  // One prompt at a time, so a second press while the phone is asking does nothing.
  const isAsking = useRef(false);
  const askForBiometrics = useCallback(async () => {
    if (isAsking.current) return;
    isAsking.current = true;
    try {
      const isPassed = await whileBiometricsPromptIsOpen(() =>
        lock.askForBiometrics(copy.lock.promptMessage),
      );
      if (isPassed) onUnlock();
    } finally {
      isAsking.current = false;
    }
  }, [lock, onUnlock]);

  // The prompt shows once each time this screen appears. It does not show again when the screen
  // renders again, only when the player presses the link.
  const hasShownPrompt = useRef(false);
  useEffect(() => {
    if (!canUseBiometrics || hasShownPrompt.current) return;
    hasShownPrompt.current = true;
    void askForBiometrics();
  }, [canUseBiometrics, askForBiometrics]);

  const checkPin = async (pin: string) => {
    try {
      const result = await lock.checkPin(pin);
      switch (result.status) {
        case 'correct':
        case 'lockOff':
          // With no PIN left there is nothing to protect, so the player may in.
          onUnlock();
          return undefined;
        case 'wrong':
          return wrongPinLine(result.triesLeftBeforeWait);
        case 'waiting':
          startWait(result.remainingMilliseconds);
          return undefined;
      }
    } catch {
      // Secure storage cannot be reached, so the app stays locked.
      return copy.lock.checkFailed;
    }
  };

  return (
    <PinEntryStep
      hero={
        <View className="items-center gap-12">
          <AppMark size={64} />
          <Text accessibilityRole="header" className="type-title text-center text-foreground">
            {copy.lock.title}
          </Text>
        </View>
      }
      onSubmit={checkPin}
      message={message}
      disabled={isWaiting}
      below={
        <View className="flex-row items-center justify-between">
          {canUseBiometrics ? (
            <FeedbackPressable
              accessibilityRole="button"
              onPress={() => void askForBiometrics()}
              className="min-h-48 items-center justify-center"
            >
              <Text className="type-caption text-muted underline">
                {copy.biometrics.kinds[kind].tryAgain}
              </Text>
            </FeedbackPressable>
          ) : (
            <View />
          )}
          <FeedbackPressable
            accessibilityRole="button"
            onPress={() => setIsForgotPinOpen(true)}
            className="min-h-48 items-center justify-center"
          >
            <Text className="type-caption text-muted underline">{copy.lock.forgot}</Text>
          </FeedbackPressable>
          {isForgotPinOpen ? (
            <ClearEverythingDialog
              variant="forgotPin"
              clearEverything={clearEverything}
              onCancel={() => setIsForgotPinOpen(false)}
            />
          ) : null}
        </View>
      }
    />
  );
}
