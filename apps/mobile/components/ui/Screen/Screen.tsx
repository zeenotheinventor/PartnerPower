import { cssInterop } from 'nativewind';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ScreenProps } from './types';

// The safe area view needs the interop so that it accepts a class name.
const ThemedSafeAreaView = cssInterop(SafeAreaView, { className: 'style' });

// A screen is a layout container and has no accessibility role of its own. Its name for a screen
// reader comes from the Header heading inside it.
export function Screen({ children, scroll = false }: ScreenProps) {
  return (
    <ThemedSafeAreaView className="flex-1 bg-background">
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow gap-16 px-16 pb-24 pt-16"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 gap-16 px-16 pb-24 pt-16">{children}</View>
      )}
    </ThemedSafeAreaView>
  );
}
