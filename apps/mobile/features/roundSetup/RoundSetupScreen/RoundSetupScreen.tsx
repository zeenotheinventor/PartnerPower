import { categoryNames, copy, decks, levelNames } from '@getfreak/content';
import {
  categoriesForLevel,
  levelIds,
  type CategoryId,
  type Deck,
  type LevelId,
  type PlayerNames,
  type RoundLength,
} from '@getfreak/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import {
  Button,
  CategoryToggle,
  Character,
  Header,
  Screen,
  SegmentedControl,
  TextField,
  Toggle,
} from '../../../components/ui';
import { useSettings } from '../../../settings';
import { useRound } from '../../round/RoundProvider';
import { randomSeed } from '../randomSeed';

const maxNameLength = 20;
const defaultLevel: LevelId = 'l2';
const defaultLength: RoundLength = 20;
const playRoute = '/games/dares/play';

// Until a deck ships there is nothing to deal, and the round that starts from this is already over.
const deckWithoutCards: Deck = { id: 'no-cards', version: 1, cards: [] };

const levelOptions = levelIds.map((levelId) => ({ value: levelId, label: levelNames[levelId] }));

const lengthOptions: { value: RoundLength; label: string }[] = [
  { value: 10, label: copy.roundSetup.lengthTen },
  { value: 20, label: copy.roundSetup.lengthTwenty },
  { value: 'endless', label: copy.roundSetup.lengthEndless },
];

const tidyName = (name: string) => name.trim().slice(0, maxNameLength);

export function RoundSetupScreen() {
  const router = useRouter();
  const { playerNames, savePlayerNames } = useSettings();
  const { startNewRound } = useRound();

  // A stored value is tidied the way a typed one is, so it can never exceed what the screen allows.
  const [names, setNames] = useState<PlayerNames>([
    tidyName(playerNames[0]),
    tidyName(playerNames[1]),
  ]);
  const [level, setLevel] = useState<LevelId>(defaultLevel);
  const [enabledCategories, setEnabledCategories] = useState<readonly CategoryId[]>(
    categoriesForLevel(defaultLevel),
  );
  const [length, setLength] = useState<RoundLength>(defaultLength);

  const levelCategories = categoriesForLevel(level);
  const isLastCategoryOn = enabledCategories.length === 1;
  const canStart = names.every((name) => tidyName(name) !== '');

  // A deep link can open this screen with nothing behind it, so it falls back to the first screen.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const chooseLevel = (nextLevel: LevelId) => {
    setLevel(nextLevel);
    setEnabledCategories(categoriesForLevel(nextLevel));
  };

  // The last category on is locked, so this is a second guard for the same rule.
  const setCategoryOn = (category: CategoryId, isOn: boolean) =>
    setEnabledCategories((current) => {
      if (!isOn && isLastCategoryOn) return current;
      return levelCategories.filter((id) => (id === category ? isOn : current.includes(id)));
    });

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
    const [first, second] = names;
    const tidiedNames: PlayerNames = [tidyName(first), tidyName(second)];
    const [firstDeck = deckWithoutCards] = decks;
    startNewRound(
      {
        players: tidiedNames,
        level,
        enabledCategories,
        length,
        seed: randomSeed(),
      },
      firstDeck,
    );
    // Saving never rejects, and the round does not wait for it.
    void savePlayerNames(tidiedNames);
    router.push(playRoute);
  };

  return (
    <Screen scroll avoidKeyboard>
      <Header
        title={copy.roundSetup.title}
        backLabel={copy.roundSetup.backLabel}
        onBack={goBack}
        trailing={
          // Mei deals the cards. With one category left on, Nyx takes her place.
          isLastCategoryOn ? (
            <Character character="gatekeeper" mood="happy" size="tile" crop="head" />
          ) : (
            <Character character="dealer" mood="flirty" size="tile" crop="head" />
          )
        }
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

      <SegmentedControl
        label={copy.roundSetup.lengthLabel}
        options={lengthOptions}
        value={length}
        onValueChange={setLength}
      />

      <View className="rounded-lg border-2 border-dashed border-border px-12">
        <Toggle label={copy.roundSetup.surprises} value={false} disabled onValueChange={() => {}} />
      </View>

      <View className="flex-1" />

      <Button label={copy.roundSetup.start} fullWidth disabled={!canStart} onPress={start} />
    </Screen>
  );
}
