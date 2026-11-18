import { useFonts } from 'expo-font';
import type { ReactNode } from 'react';

import { fontFiles } from '../../fonts/fontFiles';

type FontGateProps = { children: ReactNode };

/** Renders its children once the bundled fonts are ready. A load error shows them with the system font. */
export function FontGate({ children }: FontGateProps) {
  const [fontsLoaded, fontError] = useFonts(fontFiles);

  if (!fontsLoaded && !fontError) return null;
  return children;
}
