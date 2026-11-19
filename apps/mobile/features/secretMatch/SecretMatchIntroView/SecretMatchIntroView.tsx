import { copy, levelNames, questionDecks, topicNames } from '@getfreak/content';
import {
  availableItemCount,
  categoriesForLevel,
  levelIds,
  minimumItemCount,
  topicIds,
  type LevelId,
  type PlayerNames,
  type SecretMatchSetup,
  type TopicId,
} from '@getfreak/core';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  Button,
  Card,
  Character,
  Header,
  Screen,
  SegmentedControl,
  TextField,
  Toggle,
} from '../../../components/ui';
import { useDiscoveries } from '../../../personal';
import { useSettings } from '../../../settings';
import { LineBox } from '../../questionsPlay/LineBox';
import { randomSeed } from '../../roundSetup/randomSeed';
import { useSecretMatch } from '../SecretMatchProvider';
import type { SecretMatchIntroViewProps } from './types';

const maxNameLength = 20;
const defaultLevel: LevelId = 'l2';

const levelOptions = levelIds.map((levelId) => ({ value: levelId, label: levelNames[levelId] }));
const howItWorksLines = [copy.secretMatch.how1, copy.secretMatch.how2, copy.secretMatch.how3];

const tidyName = (name: string) => name.trim().slice(0, maxNameLength);

/**
 * Before the first pass: what secret match is and what it promises, the two names, the level and
 * the topics. The categories are the level's own, and the engine fixes the number of items, so
 * there is no format or length to choose. Nothing here logs.
 */
export function SecretMatchIntroView({ onBack }: SecretMatchIntroViewProps) {
  const { playerNames, savePlayerNames } = useSettings();
  const { discoveries } = useDiscoveries();
  const { start } = useSecretMatch();

  // A stored value is tidied the way a typed one is, so it can never exceed what the view allows.
  const [names, setNames] = useState<PlayerNames>([
    tidyName(playerNames[0]),
    tidyName(playerNames[1]),
  ]);
  const [level, setLevel] = useState<LevelId>(defaultLevel);
  const [enabledTopics, setEnabledTopics] = useState<readonly TopicId[]>(topicIds);

  const tidiedNames: PlayerNames = [tidyName(names[0]), tidyName(names[1])];
  // Items already matched in an earlier session are dealt last, so a new session tries new ones first.
  const avoidIds = discoveries.flatMap((discovery) =>
    discovery.kind === 'match' ? [discovery.questionId] : [],
  );
  const setup: SecretMatchSetup = {
    players: tidiedNames,
    level,
    enabledCategories: categoriesForLevel(level),
    enabledTopics,
    seed: 0,
    avoidIds,
  };
  const questions = questionDecks.flatMap((deck) => deck.questions);
  const hasTooFewItems = availableItemCount(setup, questions) < minimumItemCount;
  const isLastTopicOn = enabledTopics.length === 1;
  const canStart = tidiedNames.every((name) => name !== '') && !hasTooFewItems;

  // The last topic on is locked, so keeping it on here is a second guard for the same rule.
  const setTopicOn = (topic: TopicId, isOn: boolean) =>
    setEnabledTopics((current) => {
      const next = topicIds.filter((id) => (id === topic ? isOn : current.includes(id)));
      return next.length === 0 ? current : next;
    });

  const startSession = () => {
    start({ ...setup, seed: randomSeed() }, questions);
    // Saving never rejects, and the session does not wait for it.
    void savePlayerNames(tidiedNames);
  };

  return (
    <Screen scroll avoidKeyboard>
      <Header
        title={copy.secretMatch.title}
        backLabel={copy.secretMatch.backLabel}
        onBack={onBack}
      />

      <View className="flex-row items-center gap-12">
        <Character character="shy" mood="coverEyes" size="tile" crop="head" />
        <View className="flex-1">
          <LineBox>{copy.secretMatch.theoLine}</LineBox>
        </View>
      </View>

      <Card>
        <View className="gap-12">
          <Text className="type-caption uppercase text-muted">{copy.secretMatch.howLabel}</Text>
          {howItWorksLines.map((line, index) => (
            <View key={line} className="flex-row items-center gap-12">
              <Text className="type-heading w-16 text-foreground">{index + 1}</Text>
              <Text className="type-body flex-1 text-foreground">{line}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card accent>
        <View className="gap-4">
          <Text className="type-heading text-foreground">{copy.secretMatch.promiseTitle}</Text>
          <Text className="type-body text-muted">{copy.secretMatch.promiseBody}</Text>
        </View>
      </Card>

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
        onValueChange={setLevel}
      />

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

      {hasTooFewItems ? (
        <View accessibilityLiveRegion="polite">
          <LineBox>{copy.secretMatch.tooFew}</LineBox>
        </View>
      ) : null}

      <View className="flex-1" />

      <Button
        label={copy.secretMatch.start}
        fullWidth
        disabled={!canStart}
        onPress={startSession}
      />
    </Screen>
  );
}
