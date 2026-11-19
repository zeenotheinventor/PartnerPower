import {
  categoryNames,
  copy,
  fillCopy,
  levelNames,
  questionDecks,
  questionFormatNames,
  topicNames,
} from '@getfreak/content';
import {
  availableQuestionCount,
  categoriesForLevel,
  levelIds,
  playableFormats,
  topicIds,
  type CategoryId,
  type LevelId,
  type PlayableFormat,
  type PlayerNames,
  type Question,
  type QuestionRoundSetup,
  type RoundLength,
  type TopicId,
} from '@getfreak/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import {
  Button,
  CategoryToggle,
  Card,
  Header,
  Screen,
  SegmentedControl,
  TextField,
  Toggle,
} from '../../../components/ui';
import { useSettings } from '../../../settings';
import { useQuestionRound } from '../../questionRound/QuestionRoundProvider';
import { randomSeed } from '../../roundSetup/randomSeed';

const maxNameLength = 20;
const defaultLevel: LevelId = 'l2';
const defaultLength: RoundLength = 20;
const homeRoute = '/games/questions';
const playRoute = '/games/questions/play';

// The player's own questions join the shipped ones here once the device stores them.
const playerQuestions: readonly Question[] = [];

const levelOptions = levelIds.map((levelId) => ({ value: levelId, label: levelNames[levelId] }));

const lengthOptions: { value: RoundLength; label: string }[] = [
  { value: 10, label: copy.questionsSetup.lengthTen },
  { value: 20, label: copy.questionsSetup.lengthTwenty },
  { value: 'endless', label: copy.questionsSetup.lengthEndless },
];

const tidyName = (name: string) => name.trim().slice(0, maxNameLength);

// One switch on or off in a list of choices, where the last one on stays on.
function withChoice<Value extends string>(
  allValues: readonly Value[],
  current: readonly Value[],
  choice: Value,
  isOn: boolean,
): readonly Value[] {
  const next = allValues.filter((value) => (value === choice ? isOn : current.includes(value)));
  return next.length === 0 ? current : next;
}

export function QuestionsSetupScreen() {
  const router = useRouter();
  const { playerNames, savePlayerNames } = useSettings();
  const { startNewRound } = useQuestionRound();

  // A stored value is tidied the way a typed one is, so it can never exceed what the screen allows.
  const [names, setNames] = useState<PlayerNames>([
    tidyName(playerNames[0]),
    tidyName(playerNames[1]),
  ]);
  const [level, setLevel] = useState<LevelId>(defaultLevel);
  const [enabledCategories, setEnabledCategories] = useState<readonly CategoryId[]>(
    categoriesForLevel(defaultLevel),
  );
  const [enabledFormats, setEnabledFormats] = useState<readonly PlayableFormat[]>(playableFormats);
  const [enabledTopics, setEnabledTopics] = useState<readonly TopicId[]>(topicIds);
  const [length, setLength] = useState<RoundLength>(defaultLength);

  const levelCategories = categoriesForLevel(level);
  const isLastCategoryOn = enabledCategories.length === 1;
  const isLastFormatOn = enabledFormats.length === 1;
  const isLastTopicOn = enabledTopics.length === 1;
  const canStart = names.every((name) => tidyName(name) !== '');

  const questions = [...questionDecks.flatMap((deck) => deck.questions), ...playerQuestions];
  const tidiedNames: PlayerNames = [tidyName(names[0]), tidyName(names[1])];
  const setup: QuestionRoundSetup = {
    players: tidiedNames,
    level,
    enabledCategories,
    enabledFormats,
    enabledTopics,
    length,
    seed: 0,
  };
  const questionCount = availableQuestionCount(setup, questions);
  const hasTooFewQuestions = length !== 'endless' && questionCount < length;

  // A deep link can open this screen with nothing behind it, so it falls back to the home.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(homeRoute));

  const chooseLevel = (nextLevel: LevelId) => {
    setLevel(nextLevel);
    setEnabledCategories(categoriesForLevel(nextLevel));
  };

  // The last choice on is locked, so keeping it on here is a second guard for the same rule.
  const setCategoryOn = (category: CategoryId, isOn: boolean) =>
    setEnabledCategories((current) => withChoice(levelCategories, current, category, isOn));
  const setFormatOn = (format: PlayableFormat, isOn: boolean) =>
    setEnabledFormats((current) => withChoice(playableFormats, current, format, isOn));
  const setTopicOn = (topic: TopicId, isOn: boolean) =>
    setEnabledTopics((current) => withChoice(topicIds, current, topic, isOn));

  // A fast second press must not stack a second round screen. The screen stays mounted under the
  // round screen, so Start is allowed again when it regains focus.
  const hasStarted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      hasStarted.current = false;
    }, []),
  );

  const start = () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startNewRound({ ...setup, seed: randomSeed() }, questions);
    // Saving never rejects, and the round does not wait for it.
    void savePlayerNames(tidiedNames);
    router.push(playRoute);
  };

  return (
    <Screen scroll avoidKeyboard>
      <Header
        title={copy.questionsSetup.title}
        backLabel={copy.questionsSetup.backLabel}
        onBack={goBack}
      />

      <View className="flex-row gap-8">
        <View className="flex-1">
          <TextField
            label={copy.roundSetup.playerOneLabel}
            value={names[0]}
            onChangeText={(text) => setNames([text, names[1]])}
            maxLength={maxNameLength}
          />
        </View>
        <View className="flex-1">
          <TextField
            label={copy.roundSetup.playerTwoLabel}
            value={names[1]}
            onChangeText={(text) => setNames([names[0], text])}
            maxLength={maxNameLength}
          />
        </View>
      </View>

      <SegmentedControl
        label={copy.roundSetup.levelLabel}
        options={levelOptions}
        value={level}
        onValueChange={chooseLevel}
      />

      <View className="gap-4">
        <Text className="type-caption uppercase text-muted">{copy.roundSetup.categoriesLabel}</Text>
        <View className="flex-row flex-wrap gap-8">
          {levelCategories.map((category) => {
            const isOn = enabledCategories.includes(category);
            return (
              <View key={category} className="w-[48%]">
                <CategoryToggle
                  label={categoryNames[category]}
                  category={category}
                  value={isOn}
                  locked={isOn && isLastCategoryOn}
                  lockedHint={copy.roundSetup.lastCategoryHint}
                  onValueChange={(nextIsOn) => setCategoryOn(category, nextIsOn)}
                />
              </View>
            );
          })}
        </View>
        {isLastCategoryOn ? (
          <Text className="type-caption text-muted">{copy.roundSetup.lastCategoryHint}</Text>
        ) : null}
      </View>

      <View className="gap-4">
        <Text className="type-caption uppercase text-muted">
          {copy.questionsSetup.formatsLabel}
        </Text>
        <Card grouped={false}>
          <View className="gap-4">
            {playableFormats.map((format, index) => {
              const isOn = enabledFormats.includes(format);
              return (
                <View key={format} className={index === 0 ? '' : 'border-t-2 border-border'}>
                  <Toggle
                    label={questionFormatNames[format]}
                    value={isOn}
                    locked={isOn && isLastFormatOn}
                    lockedHint={copy.questionsSetup.lastFormatHint}
                    onValueChange={(nextIsOn) => setFormatOn(format, nextIsOn)}
                  />
                </View>
              );
            })}
          </View>
        </Card>
        {isLastFormatOn ? (
          <Text className="type-caption text-muted">{copy.questionsSetup.lastFormatHint}</Text>
        ) : null}
      </View>

      <View className="gap-4">
        <Text className="type-caption uppercase text-muted">{copy.questionsSetup.topicsLabel}</Text>
        <Card grouped={false}>
          <View className="gap-4">
            {topicIds.map((topic, index) => {
              const isOn = enabledTopics.includes(topic);
              return (
                <View key={topic} className={index === 0 ? '' : 'border-t-2 border-border'}>
                  <Toggle
                    label={topicNames[topic]}
                    value={isOn}
                    locked={isOn && isLastTopicOn}
                    lockedHint={copy.questionsSetup.lastTopicHint}
                    onValueChange={(nextIsOn) => setTopicOn(topic, nextIsOn)}
                  />
                </View>
              );
            })}
          </View>
        </Card>
        {isLastTopicOn ? (
          <Text className="type-caption text-muted">{copy.questionsSetup.lastTopicHint}</Text>
        ) : null}
      </View>

      <SegmentedControl
        label={copy.questionsSetup.lengthLabel}
        options={lengthOptions}
        value={length}
        onValueChange={setLength}
      />

      {hasTooFewQuestions ? (
        <View
          accessibilityLiveRegion="polite"
          className="rounded-lg border-2 border-border bg-surface p-12"
        >
          <Text className="type-body-bold text-foreground">
            {fillCopy(copy.questionsSetup.tooFew, { count: questionCount })}
          </Text>
        </View>
      ) : null}

      <View className="flex-1" />

      <Button label={copy.questionsSetup.start} fullWidth disabled={!canStart} onPress={start} />
    </Screen>
  );
}
