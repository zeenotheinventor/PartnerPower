import { useRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { hideSplashScreen } from './hideSplashScreen';

type SplashRevealProps = { children: ReactNode };

/** Hides the splash screen the first time its children have been laid out, so no blank frame shows. */
export function SplashReveal({ children }: SplashRevealProps) {
  const hasHidden = useRef(false);

  const hideOnce = () => {
    if (hasHidden.current) return;
    hasHidden.current = true;
    void hideSplashScreen();
  };

  return (
    <View className="flex-1 bg-background" onLayout={hideOnce}>
      {children}
    </View>
  );
}
