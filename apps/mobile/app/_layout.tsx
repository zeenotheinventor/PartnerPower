import '../global.css';

import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { EntryStack } from '../components/EntryStack';
import { FontGate } from '../components/FontGate';
import { SplashSafetyNet } from '../components/SplashSafetyNet';
import { ThemedNavigation } from '../components/ThemedNavigation';
import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { PersonalDataProvider } from '../personal';
import { SettingsProvider } from '../settings';
import { UpdateToastHost } from '../updates/UpdateToastHost';

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
          <PersonalDataProvider>
            <FeedbackProvider>
              <StatusBar style="auto" />
              <EntryStack />
              <UpdateToastHost />
            </FeedbackProvider>
          </PersonalDataProvider>
        </SettingsProvider>
      </FontGate>
    </ThemedNavigation>
  );
}
