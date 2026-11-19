import { copy } from '@getfreak/content';
import { useState } from 'react';

import { PinEntryStep } from '../PinEntryStep';
import { useClearOnBackground } from '../useClearOnBackground';
import type { ChoosePinStepsProps } from './types';

// The first PIN is held here only until the second one is typed, and is never logged or stored.
// Each step has a new key every time it is shown, so its dots start empty.
type Stage =
  | { name: 'enter'; showNumber: number; mismatchError?: string }
  | { name: 'confirm'; showNumber: number; firstPin: string };

/**
 * Choose a PIN, then enter it again. A second PIN that differs goes back to the first step with the
 * error line, and the first PIN is forgotten. The flow decides what to do with the PIN once it is
 * typed twice the same.
 */
export function ChoosePinSteps({ enterTitle, onBack, onChosen }: ChoosePinStepsProps) {
  const [stage, setStage] = useState<Stage>({ name: 'enter', showNumber: 0 });

  // Leaving the app forgets the first PIN, and the player starts again at the first step.
  useClearOnBackground(() =>
    setStage((current) => ({ name: 'enter', showNumber: current.showNumber + 1 })),
  );

  if (stage.name === 'enter') {
    return (
      <PinEntryStep
        key={`enter-${stage.showNumber}`}
        title={enterTitle}
        subtitle={copy.lockSetup.enterSubtitle}
        onBack={onBack}
        initialError={stage.mismatchError}
        onSubmit={async (pin) => {
          setStage({ name: 'confirm', showNumber: stage.showNumber + 1, firstPin: pin });
          return undefined;
        }}
      />
    );
  }

  return (
    <PinEntryStep
      key={`confirm-${stage.showNumber}`}
      title={copy.lockSetup.confirmTitle}
      subtitle={copy.lockSetup.confirmSubtitle}
      onBack={() => setStage({ name: 'enter', showNumber: stage.showNumber + 1 })}
      onSubmit={async (pin) => {
        if (pin === stage.firstPin) return onChosen(pin);
        setStage({
          name: 'enter',
          showNumber: stage.showNumber + 1,
          mismatchError: copy.lockSetup.mismatch,
        });
        return undefined;
      }}
    />
  );
}
