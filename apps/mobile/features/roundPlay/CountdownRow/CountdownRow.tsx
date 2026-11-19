import { copy } from '@getfreak/content';
import { View } from 'react-native';

import { Button, Countdown } from '../../../components/ui';
import { countdownSecondsText } from '../countdownSecondsText';
import type { CountdownRowProps } from './types';

/**
 * A countdown with one button beside it, for a card that is started by hand. The button is the
 * primary start while ready, and the secondary stop while it runs. The caller keeps the run, so
 * this holds no state. It is the row of the vibration card and of a card with a time on it.
 */
export function CountdownRow({
  seconds,
  startedAt,
  isRunning,
  startLabel,
  stopLabel,
  onStart,
  onStop,
  onEnd,
}: CountdownRowProps) {
  return (
    <View className="flex-row items-center gap-12">
      <View className="flex-1">
        <Countdown
          seconds={seconds}
          startedAt={startedAt}
          label={copy.roundPlay.countdownLabel}
          secondsText={countdownSecondsText}
          endText={copy.roundPlay.timerDone}
          onEnd={onEnd}
        />
      </View>
      <View className="w-1/3">
        <Button
          label={isRunning ? stopLabel : startLabel}
          variant={isRunning ? 'secondary' : 'primary'}
          fullWidth
          onPress={isRunning ? onStop : onStart}
        />
      </View>
    </View>
  );
}
