import { copy } from '@getfreak/content';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Header, PinPad, Screen } from '../../../components/ui';
import { useClearOnBackground } from '../useClearOnBackground';
import type { PinEntryStepProps } from './types';

// The fourth dot fills and is seen before the step moves on.
const fullDotsHoldMilliseconds = 150;

/**
 * A screen that asks for a PIN: a header, the dots and the keypad. The digits are held here only
 * while the step is on screen. They are never logged and never stored. They go to `onSubmit` and
 * nowhere else.
 */
export function PinEntryStep(props: PinEntryStepProps) {
  const { onSubmit, initialError, message, disabled = false, below } = props;
  const [value, setValue] = useState('');
  const [error, setError] = useState(initialError);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set the moment the last number is typed, before any render, so two presses in one frame cannot
  // both submit. It stays set until the submit has answered.
  const isSubmitting = useRef(false);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  // Leaving the app forgets what was typed. A submit that is already running finishes and clears
  // the dots itself.
  useClearOnBackground(() => {
    if (holdTimer.current !== undefined) {
      clearTimeout(holdTimer.current);
      holdTimer.current = undefined;
      isSubmitting.current = false;
    } else if (isSubmitting.current) {
      return;
    }
    setValue('');
  });

  const change = (next: string) => {
    // The keypad stays as it is while the last number is held and checked.
    if (isSubmitting.current) return;
    setError(undefined);
    setValue(next);
  };

  const submit = (pin: string) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    holdTimer.current = setTimeout(async () => {
      holdTimer.current = undefined;
      // A step that fails to answer must not leave the player stuck with full dots.
      const answer = await onSubmit(pin).catch(() => copy.lock.saveFailed);
      setError(answer);
      setValue('');
      isSubmitting.current = false;
    }, fullDotsHoldMilliseconds);
  };

  return (
    <Screen>
      {props.hero ? (
        <>
          <View className="flex-1" />
          {props.hero}
        </>
      ) : (
        <>
          {props.onBack ? (
            <Header
              title={props.title}
              subtitle={props.subtitle}
              backLabel={copy.lockSetup.backLabel}
              onBack={props.onBack}
            />
          ) : (
            <Header title={props.title} subtitle={props.subtitle} />
          )}
          <View className="flex-1" />
        </>
      )}
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
