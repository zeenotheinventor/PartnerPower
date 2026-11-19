import { View } from 'react-native';

import { AppMark } from '../AppMark';

/**
 * The splash look: the mark alone on the theme background, with no words, so it shows nothing of
 * the app and does not name it. It covers the screen while the lock is on and the app is away or
 * being checked, so the app switcher takes its snapshot of this and not of the screen.
 */
export function PrivacyCover() {
  return (
    // It has no text and no role, because it shows nothing, so a test finds it by its test ID.
    <View
      testID="privacy-cover"
      className="absolute inset-0 items-center justify-center bg-background"
    >
      <AppMark size={200} />
    </View>
  );
}
