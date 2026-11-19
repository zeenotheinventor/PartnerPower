import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import doneSound from '../assets/sounds/done.wav';
import passSound from '../assets/sounds/pass.wav';
import tapSound from '../assets/sounds/tap.wav';
import type { FeedbackDevice, FeedbackMoment, FeedbackSound } from './types';

// The phone's own settings decide whether any of this is felt or heard. These calls return a
// promise that rejects when the device has no haptics, and that is fine, so nothing waits on it.
function ignoreFailure(action: () => Promise<void>) {
  try {
    action().catch(() => {});
  } catch {
    // Deliberately ignored, see above.
  }
}

type HapticStep = { afterMilliseconds: number; fire: () => Promise<void> };

const impact = (style: Haptics.ImpactFeedbackStyle) => () => Haptics.impactAsync(style);
const notification = (type: Haptics.NotificationFeedbackType) => () =>
  Haptics.notificationAsync(type);
const androidEffect = (effect: Haptics.AndroidHaptics) => () =>
  Haptics.performAndroidHapticsAsync(effect);

const { ImpactFeedbackStyle, NotificationFeedbackType, AndroidHaptics } = Haptics;

// iOS taps and notifications are its own system patterns, and they follow the System Haptics
// setting. A press is one pulse, done and pass are two different notification patterns, and the end
// of a round is a longer run of pulses, so none of them can be mistaken for another.
const iosPlans: Record<FeedbackMoment, HapticStep[]> = {
  tap: [{ afterMilliseconds: 0, fire: impact(ImpactFeedbackStyle.Light) }],
  done: [{ afterMilliseconds: 0, fire: notification(NotificationFeedbackType.Success) }],
  pass: [{ afterMilliseconds: 0, fire: notification(NotificationFeedbackType.Warning) }],
  roundComplete: [
    { afterMilliseconds: 0, fire: notification(NotificationFeedbackType.Success) },
    { afterMilliseconds: 220, fire: impact(ImpactFeedbackStyle.Rigid) },
    { afterMilliseconds: 340, fire: impact(ImpactFeedbackStyle.Heavy) },
    { afterMilliseconds: 480, fire: notification(NotificationFeedbackType.Success) },
  ],
};

// Android uses the view haptic effects, not the vibrator, because those follow the phone's touch
// feedback setting and need no permission.
const androidPlans: Record<FeedbackMoment, HapticStep[]> = {
  tap: [{ afterMilliseconds: 0, fire: androidEffect(AndroidHaptics.Virtual_Key) }],
  done: [{ afterMilliseconds: 0, fire: androidEffect(AndroidHaptics.Confirm) }],
  pass: [{ afterMilliseconds: 0, fire: androidEffect(AndroidHaptics.Reject) }],
  roundComplete: [
    { afterMilliseconds: 0, fire: androidEffect(AndroidHaptics.Confirm) },
    { afterMilliseconds: 200, fire: androidEffect(AndroidHaptics.Long_Press) },
    { afterMilliseconds: 340, fire: androidEffect(AndroidHaptics.Confirm) },
    { afterMilliseconds: 480, fire: androidEffect(AndroidHaptics.Long_Press) },
  ],
};

function playOnce(player: AudioPlayer) {
  // A player that has finished must be rewound before it plays again. The rewind is not waited
  // for, so the sound starts with the press.
  ignoreFailure(() => player.seekTo(0));
  player.play();
}

/**
 * The real phone. It sets the audio session and loads every sound when it is created, so the first
 * press has nothing left to load. It mixes with other audio and respects the iOS silent switch.
 * Nothing it does logs, throws or waits.
 */
export function createNativeFeedbackDevice(): FeedbackDevice {
  ignoreFailure(() =>
    setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    }),
  );

  const players: Record<FeedbackSound, AudioPlayer> = {
    tap: createAudioPlayer(tapSound),
    done: createAudioPlayer(doneSound),
    pass: createAudioPlayer(passSound),
  };

  return {
    playSound: (sound) => {
      try {
        playOnce(players[sound]);
      } catch {
        // A sound that cannot play is skipped.
      }
    },
    triggerHaptic: (moment) => {
      const plans = Platform.OS === 'android' ? androidPlans : iosPlans;
      plans[moment].forEach(({ afterMilliseconds, fire }) => {
        if (afterMilliseconds === 0) {
          ignoreFailure(fire);
        } else {
          setTimeout(() => ignoreFailure(fire), afterMilliseconds);
        }
      });
    },
  };
}
