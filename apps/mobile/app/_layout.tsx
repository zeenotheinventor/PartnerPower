import '../global.css';

import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { EntryStack } from '../components/EntryStack';
import { FontGate } from '../components/FontGate';
import { SplashSafetyNet } from '../components/SplashSafetyNet';
import { ThemedNavigation } from '../components/ThemedNavigation';
import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { CrashBoundary, initMonitoring, reportError, RouteTrail } from '../monitoring';
import { PersonalDataProvider } from '../personal';
import { SettingsProvider } from '../settings';
import { InstallMarkerGate, RootRemount } from '../storage';
import { UpdateToastHost } from '../updates/UpdateToastHost';

// Starts error reporting before anything renders, so a failure in the first screen is reported. It
// does nothing in development, in tests, or in a build that was given no DSN.
initMonitoring();

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
        <CrashBoundary onError={reportError}>
          <InstallMarkerGate>
            <RootRemount>
              <SettingsProvider>
                <PersonalDataProvider>
                  <FeedbackProvider>
                    <StatusBar style="auto" />
                    <RouteTrail />
                    <EntryStack />
                    <UpdateToastHost />
                  </FeedbackProvider>
                </PersonalDataProvider>
              </SettingsProvider>
            </RootRemount>
          </InstallMarkerGate>
        </CrashBoundary>
      </FontGate>
    </ThemedNavigation>
  );
}
