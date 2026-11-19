import { copy } from '@getfreak/content';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Header, PinPad, Screen } from '../../../components/ui';
import type { PinEntryStepProps } from './types';

// The fourth dot fills and is seen before the step moves on.
const fullDotsHoldMilliseconds = 150;

/**
 * A screen that asks for a PIN: a header, the dots and the keypad. The digits are held here only
 * while the step is on screen. They are never logged and never stored. They go to `onSubmit` and
 * nowhere else.
 */
export function PinEntryStep({
  title,
  subtitle,
  onBack,
  onSubmit,
  initialError,
  message,
  disabled = false,
  below,
}: PinEntryStepProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(initialError);
  const [isChecking, setIsChecking] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  const change = (next: string) => {
    // The keypad stays as it is while the last digit is held and checked.
    if (isChecking) return;
    setError(undefined);
    setValue(next);
  };

  const submit = (pin: string) => {
    setIsChecking(true);
    holdTimer.current = setTimeout(async () => {
      // A step that fails to answer must not leave the player stuck with full dots.
      const answer = await onSubmit(pin).catch(() => copy.lock.saveFailed);
      setError(answer);
      setValue('');
      setIsChecking(false);
    }, fullDotsHoldMilliseconds);
  };

  return (
    <Screen>
      {onBack ? (
        <Header
          title={title}
          subtitle={subtitle}
          backLabel={copy.lockSetup.backLabel}
          onBack={onBack}
        />
      ) : (
        <Header title={title} subtitle={subtitle} />
      )}
      <View className="flex-1" />
      <PinPad
        value={value}
        onChange={change}
        onComplete={submit}
        error={error}
        message={message}
        disabled={disabled}
      />
      {below}
    </Screen>
  );
}
