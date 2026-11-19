import { cssInterop } from 'nativewind';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ScreenProps } from './types';

// The safe area view needs the interop so that it accepts a class name.
const ThemedSafeAreaView = cssInterop(SafeAreaView, { className: 'style' });

// A screen is a layout container and has no accessibility role of its own. Its name for a screen
// reader comes from the Header heading inside it.
export function Screen({ children, scroll = false, avoidKeyboard = false, footer }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName="grow gap-16 px-16 pb-24 pt-16"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 gap-16 px-16 pb-24 pt-16">{children}</View>
  );

  // The footer sits under the content and outside its scroll view, so it stays in reach, and inside
  // the keyboard avoiding view, so it rides above the keyboard.
  const body = (
    <>
      {content}
      {footer ? (
        <View className="gap-8 border-t-2 border-border bg-background px-16 pb-16 pt-12">
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <ThemedSafeAreaView className="flex-1 bg-background">
      {avoidKeyboard ? (
        // Padding is the behaviour React Native advises for both platforms with edge-to-edge
        // windows, where the system no longer resizes the window for the keyboard.
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </ThemedSafeAreaView>
  );
}
