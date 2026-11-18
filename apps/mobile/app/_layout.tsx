import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { FontGate } from '../components/FontGate';

export default function RootLayout() {
  return (
    <FontGate>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </FontGate>
  );
}
