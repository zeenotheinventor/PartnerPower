import '../global.css';

import { StatusBar } from 'expo-status-bar';

import { EntryStack } from '../components/EntryStack';
import { FontGate } from '../components/FontGate';
import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { PersonalDataProvider } from '../personal';
import { SettingsProvider } from '../settings';

export default function RootLayout() {
  return (
    <FontGate>
      <SettingsProvider>
        <PersonalDataProvider>
          <FeedbackProvider>
            <StatusBar style="auto" />
            <EntryStack />
          </FeedbackProvider>
        </PersonalDataProvider>
      </SettingsProvider>
    </FontGate>
  );
}
