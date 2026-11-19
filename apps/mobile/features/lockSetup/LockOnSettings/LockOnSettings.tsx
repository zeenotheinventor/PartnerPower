import { copy } from '@getfreak/content';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';

import { Card, Header, Screen, SettingsRow, Toggle } from '../../../components/ui';
import { useLockService } from '../../../lock';
import { SettingsSection } from '../../settings/SettingsSection';
import { biometricsCopyKind } from '../biometricsCopyKind';
import { ChoosePinSteps } from '../ChoosePinSteps';
import { useClearOnBackground, whileBiometricsPromptIsOpen } from '../useClearOnBackground';
import { VerifyPinStep } from '../VerifyPinStep';
import type { LockOnSettingsProps } from './types';

type Stage =
  { name: 'status' } | { name: 'verify'; purpose: 'change' | 'off' } | { name: 'newPin' };

/**
 * The lock when it is on. Change PIN and Turn off ask for the current PIN (or biometrics) first.
 * The biometrics switch asks the phone once before it turns on, and turning it off needs nothing.
 * Turning the lock off removes the PIN and the biometrics choice, and leaves for Settings.
 */
export function LockOnSettings({ availability, isBiometricsOn, onExit }: LockOnSettingsProps) {
  const lock = useLockService();
  const [stage, setStage] = useState<Stage>({ name: 'status' });
  const [isBiometricsChosen, setIsBiometricsChosen] = useState(isBiometricsOn);
  const [isChecking, setIsChecking] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);
  // Each of these is set before any render, so a second call in the same frame does nothing.
  const isVerified = useRef(false);
  const isTurningOff = useRef(false);
  const hasExited = useRef(false);
  const kind = biometricsCopyKind(availability, Platform.OS);
  const words = copy.biometrics.kinds[kind];

  // Leaving the app forgets that the current PIN was typed, so coming back asks again.
  useClearOnBackground(() => {
    isVerified.current = false;
    setStage({ name: 'status' });
  });

  const exit = () => {
    if (hasExited.current) return;
    hasExited.current = true;
    onExit();
  };

  const showProblem = (line: string) => {
    setProblem(line);
    AccessibilityInfo.announceForAccessibility(line);
  };

  const switchBiometrics = async (isOn: boolean) => {
    if (isChecking) return;
    setProblem(undefined);
    setIsChecking(true);
    try {
      if (isOn) {
        // The choice is saved only after the phone has asked once and the player has passed.
        if (
          !(await whileBiometricsPromptIsOpen(() =>
            lock.askForBiometrics(copy.biometrics.checkReason),
          ))
        ) {
          showProblem(copy.biometrics.toggleFailed);
          return;
        }
        await lock.setBiometricsChoice(true);
      } else {
        await lock.setBiometricsChoice(false);
      }
      setIsBiometricsChosen(isOn);
    } catch {
      showProblem(isOn ? copy.biometrics.toggleFailed : copy.lock.saveFailed);
    } finally {
      setIsChecking(false);
    }
  };

  const turnOff = async () => {
    if (isTurningOff.current) return;
    isTurningOff.current = true;
    try {
      await lock.clearPin();
    } catch {
      isTurningOff.current = false;
      setStage({ name: 'status' });
      showProblem(copy.lock.saveFailed);
      return;
    }
    AccessibilityInfo.announceForAccessibility(copy.lockSettings.off);
    exit();
  };

  const savePin = async (pin: string) => {
    const saved = await lock.setPin(pin).catch(() => undefined);
    if (!saved?.ok) return copy.lock.saveFailed;
    setStage({ name: 'status' });
    AccessibilityInfo.announceForAccessibility(copy.lockSettings.changed);
    return undefined;
  };

  if (stage.name === 'verify') {
    return (
      <VerifyPinStep
        purpose={stage.purpose}
        kind={kind}
        canUseBiometrics={availability.isAvailable && isBiometricsChosen}
        onBack={() => setStage({ name: 'status' })}
        onVerified={() => {
          // Verified once only, so two answers at once do not run the next step twice.
          if (isVerified.current) return;
          isVerified.current = true;
          if (stage.purpose === 'off') void turnOff();
          else setStage({ name: 'newPin' });
        }}
      />
    );
  }

  if (stage.name === 'newPin') {
    return (
      <ChoosePinSteps
        enterTitle={copy.lockSettings.newTitle}
        onBack={() => setStage({ name: 'status' })}
        onChosen={savePin}
      />
    );
  }

  return (
    <Screen scroll>
      <Header title={copy.lockSettings.title} backLabel={copy.lockSetup.backLabel} onBack={exit} />
      <Card accent>
        <View className="gap-4">
          <Text className="type-heading text-foreground">{copy.lockSettings.statusOn}</Text>
          <Text className="type-body text-muted">{copy.lockSettings.statusCaption}</Text>
        </View>
      </Card>
      <SettingsSection>
        <SettingsRow
          label={copy.lockSettings.changePin}
          onPress={() => {
            setProblem(undefined);
            isVerified.current = false;
            setStage({ name: 'verify', purpose: 'change' });
          }}
        />
        <Toggle
          label={words.toggleLabel}
          description={availability.isAvailable ? words.toggleCaption : words.unavailable}
          value={availability.isAvailable && isBiometricsChosen}
          onValueChange={(isOn) => void switchBiometrics(isOn)}
          disabled={!availability.isAvailable || isChecking}
        />
        <SettingsRow
          label={copy.lockSettings.turnOff}
          caption={copy.lockSettings.turnOffCaption}
          onPress={() => {
            setProblem(undefined);
            isVerified.current = false;
            setStage({ name: 'verify', purpose: 'off' });
          }}
        />
      </SettingsSection>
      {problem ? <Text className="type-body-bold text-danger">{problem}</Text> : null}
    </Screen>
  );
}
