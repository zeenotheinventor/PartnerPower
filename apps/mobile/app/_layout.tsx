import '../global.css';

import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { EntryStack } from '../components/EntryStack';
import { FontGate } from '../components/FontGate';
import { SplashSafetyNet } from '../components/SplashSafetyNet';
import { ThemedNavigation } from '../components/ThemedNavigation';
import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { SettingsProvider } from '../settings';

// Holds the splash screen from the first moment. SplashReveal hides it once the fonts and the
// settings are ready and the first screen has been laid out.
SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash screen was already gone, so there is nothing to hold.
});

export default function RootLayout() {
  return (
    <ThemedNavigation>
      <SplashSafetyNet />
      <FontGate>
        <SettingsProvider>
          <FeedbackProvider>
            <StatusBar style="auto" />
            <EntryStack />
          </FeedbackProvider>
        </SettingsProvider>
      </FontGate>
    </ThemedNavigation>
  );
}
