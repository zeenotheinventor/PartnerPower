import { copy, privacyPolicy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Header, Screen } from '../../../components/ui';
import { useGoBack } from '../useGoBack';

const settingsRoute = '/settings';

/** The privacy policy, as text from the content package. The screen makes no network call. */
export function PrivacyScreen() {
  const goBack = useGoBack(settingsRoute);

  return (
    <Screen scroll>
      <Header
        title={privacyPolicy.title}
        subtitle={privacyPolicy.updated}
        backLabel={copy.privacy.backLabel}
        onBack={goBack}
      />
      <View className="gap-12">
        {privacyPolicy.sections.map((section) => (
          <View key={section.heading} className="gap-4">
            <Text accessibilityRole="header" className="type-heading text-foreground">
              {section.heading}
            </Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} className="type-body text-foreground">
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
