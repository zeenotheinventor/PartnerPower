import { copy } from '@getfreak/content';
import { useState } from 'react';
import { Platform } from 'react-native';

import { useLockService } from '../../../lock';
import { biometricsCopyKind } from '../biometricsCopyKind';
import { BiometricsOfferStep } from '../BiometricsOfferStep';
import { ChoosePinSteps } from '../ChoosePinSteps';
import { DoneStep } from '../DoneStep';
import { ExplainerStep } from '../ExplainerStep';
import type { TurnOnFlowProps } from './types';

type Stage =
  | { name: 'explainer' }
  | { name: 'choosePin' }
  | { name: 'offer' }
  | { name: 'done'; isBiometricsOn: boolean };

/**
 * Turning the lock on: what it does, a PIN typed twice, then the offer of biometrics when the phone
 * has them set up, then done. The PIN is saved as soon as it is confirmed. Biometrics are saved
 * only after the phone's prompt has passed once, and Not now saves nothing.
 */
export function TurnOnFlow({ availability, onExit }: TurnOnFlowProps) {
  const lock = useLockService();
  const [stage, setStage] = useState<Stage>({ name: 'explainer' });
  const kind = biometricsCopyKind(availability, Platform.OS);

  const savePin = async (pin: string) => {
    const saved = await lock.setPin(pin).catch(() => undefined);
    if (!saved?.ok) return copy.lock.saveFailed;
    setStage(
      availability.isAvailable ? { name: 'offer' } : { name: 'done', isBiometricsOn: false },
    );
    return undefined;
  };

  const turnBiometricsOn = async () => {
    if (!(await lock.askForBiometrics(copy.biometrics.checkReason))) return false;
    await lock.setBiometricsChoice(true);
    setStage({ name: 'done', isBiometricsOn: true });
    return true;
  };

  switch (stage.name) {
    case 'explainer':
      return <ExplainerStep onCancel={onExit} onStart={() => setStage({ name: 'choosePin' })} />;
    case 'choosePin':
      return (
        <ChoosePinSteps
          enterTitle={copy.lockSetup.enterTitle}
          onBack={() => setStage({ name: 'explainer' })}
          onChosen={savePin}
        />
      );
    case 'offer':
      return (
        <BiometricsOfferStep
          kind={kind}
          onUse={turnBiometricsOn}
          onNotNow={() => setStage({ name: 'done', isBiometricsOn: false })}
        />
      );
    case 'done':
      return (
        <DoneStep
          body={
            stage.isBiometricsOn ? copy.biometrics.kinds[kind].doneBody : copy.lockSetup.doneBody
          }
          onDone={onExit}
        />
      );
  }
}
