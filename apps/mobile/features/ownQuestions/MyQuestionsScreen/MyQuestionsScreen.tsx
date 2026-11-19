import { categoryNames, copy, fillCopy, questionFormatNames, topicNames } from '@getfreak/content';
import { categoryIds, type CustomQuestion } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Character, Chip, Header, Screen } from '../../../components/ui';
import { useOwnQuestions } from '../OwnQuestionsProvider';
import { editableFormats, type EditableFormat } from '../questionFields';
import { homeRoute, newQuestionRoute, questionRoute } from '../routes';

const leadOf: Record<EditableFormat, string | undefined> = {
  ifYou: copy.questionLeads.ifYou,
  neverHave: copy.questionLeads.neverHave,
  eitherOr: copy.questionLeads.eitherOr,
  guess: undefined,
};

/** The lines a question shows after its lead: its text, then its two options for would you rather. */
function bodyLinesOf(question: CustomQuestion): string[] {
  const lines = question.text === undefined ? [] : [question.text];
  if (question.format === 'eitherOr') {
    const [first, second] = question.options.map((option) => option.text);
    // The schema gives exactly two, so the empty text only satisfies the type.
    lines.push(
      fillCopy(copy.ownQuestions.eitherOrOptions, { first: first ?? '', second: second ?? '' }),
    );
  }
  return lines;
}

// The list of the player's own questions, opened from the Drink If home. Nothing here logs, because
// a question is personal text.
export function MyQuestionsScreen() {
  const router = useRouter();
  const { questions, isLoading, hasReachedLimit } = useOwnQuestions();

  // A deep link can open this screen with nothing behind it, so it falls back to the home.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(homeRoute));

  // A format with no questions has no heading. Within a format the categories run in rank order, and
  // the questions of one category stay in the order they were written.
  const groups = editableFormats
    .map((format) => ({
      format,
      questions: categoryIds.flatMap((categoryId) =>
        questions.filter(
          (question) => question.format === format && question.category === categoryId,
        ),
      ),
    }))
    .filter((group) => group.questions.length > 0);

  const addButton = (
    <Button
      label={copy.ownQuestions.add}
      fullWidth
      disabled={hasReachedLimit}
      onPress={() => router.push(newQuestionRoute)}
    />
  );

  return (
    <Screen scroll>
      <Header
        title={copy.ownQuestions.title}
        subtitle={
          isLoading || questions.length === 0
            ? undefined
            : fillCopy(copy.ownQuestions.countLine, { count: questions.length })
        }
        backLabel={copy.ownQuestions.backLabel}
        onBack={goBack}
      />

      {isLoading ? null : questions.length === 0 ? (
        <>
          <View className="flex-1" />
          <View className="items-center gap-16">
            <Character character="shy" mood="flirty" size="hero" />
            <View className="rounded-lg border-2 border-border bg-surface p-12">
              <Text className="type-body-bold text-center text-foreground">
                {copy.ownQuestions.emptyTheo}
              </Text>
            </View>
            <Text className="type-body text-center text-muted">{copy.ownQuestions.empty}</Text>
          </View>
          {addButton}
          <View className="flex-1" />
        </>
      ) : (
        <>
          <View className="gap-8">
            {addButton}
            {hasReachedLimit ? (
              <Text className="type-label text-center text-muted">{copy.ownQuestions.limit}</Text>
            ) : null}
          </View>
          {groups.map((group) => (
            <View key={group.format} className="gap-8">
              <Text accessibilityRole="header" className="type-caption uppercase text-muted">
                {questionFormatNames[group.format]}
              </Text>
              {group.questions.map((question) => {
                const lead = leadOf[question.format];
                const lines = bodyLinesOf(question);
                return (
                  <Card
                    key={question.id}
                    category={question.category}
                    label={[lead, ...lines].filter(Boolean).join(' ')}
                    onPress={() => router.push(questionRoute(question.id))}
                  >
                    <View className="gap-8">
                      <View className="flex-row flex-wrap items-center gap-8">
                        <Chip
                          label={categoryNames[question.category]}
                          category={question.category}
                        />
                        <Text className="type-caption text-muted">
                          {topicNames[question.topic]}
                        </Text>
                      </View>
                      <Text className="type-body-bold text-foreground">
                        {lead ? <Text className="text-accent-deep">{lead} </Text> : null}
                        {lines[0]}
                      </Text>
                      {lines.slice(1).map((line) => (
                        <Text key={line} className="type-body-bold text-foreground">
                          {line}
                        </Text>
                      ))}
                    </View>
                  </Card>
                );
              })}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
