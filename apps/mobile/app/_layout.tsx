import '../global.css';

import { StatusBar } from 'expo-status-bar';

import { EntryStack } from '../components/EntryStack';
import { FontGate } from '../components/FontGate';
import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { SettingsProvider } from '../settings';

export default function RootLayout() {
  return (
    <FontGate>
      <SettingsProvider>
        <FeedbackProvider>
          <StatusBar style="auto" />
          <EntryStack />
        </FeedbackProvider>
      </SettingsProvider>
    </FontGate>
  );
}
