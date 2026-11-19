import { copy, fillCopy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, Character, Chip, Header, Screen } from '../../../components/ui';
import { useOwnQuestions } from '../../ownQuestions/OwnQuestionsProvider';
import { homeEntries } from '../homeEntries';

export function QuestionsHomeScreen() {
  const router = useRouter();
  const { isLoading, questions } = useOwnQuestions();

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

      <View className="flex-row items-center gap-12">
        <Character character="shy" mood="idle" size="tile" crop="head" />
        <View className="flex-1 rounded-lg border-2 border-border bg-surface p-12">
          <Text className="type-body-bold text-foreground">{copy.questionsHome.theoLine}</Text>
        </View>
      </View>

      {homeEntries.map(({ title, body, route, countOf }) => {
        const isComingSoon = route === null;
        // The count shows once it has been read, so it does not flash as none.
        const count =
          countOf === 'ownQuestions' && !isLoading
            ? questions.length === 0
              ? copy.questionsHome.ownNone
              : fillCopy(copy.questionsHome.ownCount, { count: questions.length })
            : undefined;
        return (
          <Card
            key={title}
            label={
              isComingSoon
                ? `${title}, ${copy.hub.comingSoon}`
                : count
                  ? fillCopy(copy.questionsHome.entryLabel, { title, count })
                  : title
            }
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
              {count ? <Chip label={count} /> : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
