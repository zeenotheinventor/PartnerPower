import { copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, Chip, Header, Screen } from '../../../components/ui';
import { homeEntries } from '../homeEntries';

export function QuestionsHomeScreen() {
  const router = useRouter();

  // A deep link can open this screen with nothing behind it, so it falls back to the hub.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen scroll>
      <Header
        title={copy.questionsHome.title}
        subtitle={copy.questionsHome.subtitle}
        backLabel={copy.questionsHome.backLabel}
        onBack={goBack}
      />

      {/* The character's art goes at the start of this row when it lands (FRK-18). */}
      <View className="flex-row items-center gap-12">
        <View className="flex-1 rounded-lg border-2 border-border bg-surface p-12">
          <Text className="type-body-bold text-foreground">{copy.questionsHome.theoLine}</Text>
        </View>
      </View>

      {homeEntries.map(({ title, body, route }) => {
        const isComingSoon = route === null;
        return (
          <Card
            key={title}
            label={isComingSoon ? `${title}, ${copy.hub.comingSoon}` : title}
            disabled={isComingSoon}
            onPress={() => {
              if (route !== null) router.push(route);
            }}
          >
            <View className="flex-row items-center gap-12">
              <View className="flex-1 gap-4">
                <Text className="type-heading text-foreground">{title}</Text>
                <Text className="type-body text-muted">{body}</Text>
              </View>
              {isComingSoon ? <Chip label={copy.hub.comingSoon} /> : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
