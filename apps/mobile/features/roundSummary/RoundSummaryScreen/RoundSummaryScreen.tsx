import { copy, fillCopy } from '@getfreak/content';
import { summarise } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { Button, Screen } from '../../../components/ui';
import { useFeedback } from '../../../feedback/FeedbackProvider';
import { useRound } from '../../round/RoundProvider';
import { randomSeed } from '../../roundSetup/randomSeed';
import { PlayerScore } from '../PlayerScore';

const hubRoute = '/';
const setupRoute = '/games/dares/setup';
const playRoute = '/games/dares/play';

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/**
 * The end of round summary: each player's dares done and drinks, who was boldest, and ways to go
 * on. Nothing here is stored or logged. The round and the setup it came from live in the round
 * context, which leaving the route group discards.
 */
export function RoundSummaryScreen() {
  const router = useRouter();
  const { round, lastStart, startNewRound } = useRound();
  const summary = round ? summarise(round) : undefined;

  // The celebration buzz fires when the summary first shows, once for the round. The ref keeps a
  // repeated render or effect from firing it again. A summary with no round has nothing to celebrate.
  const { roundComplete } = useFeedback();
  const hasCelebrated = useRef(false);
  const hasSummary = summary !== undefined;
  useEffect(() => {
    if (!hasSummary || hasCelebrated.current) return;
    hasCelebrated.current = true;
    roundComplete();
  }, [hasSummary, roundComplete]);

  // Setup is under this screen, so going back to it is how Settings opens it.
  const openSettings = () => (router.canGoBack() ? router.back() : router.replace(setupRoute));

  // Pressing twice must not start two rounds. The play screen replaces this one.
  const hasStarted = useRef(false);
  const playAgain = () => {
    if (!lastStart || hasStarted.current) return;
    hasStarted.current = true;
    startNewRound({ ...lastStart.setup, seed: randomSeed() }, lastStart.deck);
    router.replace(playRoute);
  };

  // Going to the hub ends the route group, which discards the round.
  const goHome = () => router.dismissTo(hubRoute);

  return (
    <Screen scroll>
      <View className="gap-4">
        <Text accessibilityRole="header" className="type-title text-center text-foreground">
          {copy.roundSummary.title}
        </Text>
        {summary ? (
          <Text className="type-body-bold text-center text-muted">
            {fillCopy(copy.roundSummary.subtitle, {
              cards: fillCopy(
                plural(
                  summary.cardsPlayed,
                  copy.roundSummary.cardCountOne,
                  copy.roundSummary.cardCountMany,
                ),
                { count: summary.cardsPlayed },
              ),
              categories: fillCopy(
                plural(
                  summary.categoriesReached.length,
                  copy.roundSummary.categoryCountOne,
                  copy.roundSummary.categoryCountMany,
                ),
                { count: summary.categoriesReached.length },
              ),
            })}
          </Text>
        ) : null}
      </View>

      {summary ? (
        <>
          <View className="flex-row gap-12 pt-12">
            {summary.players.map((player, index) => (
              <View key={index} className="flex-1">
                <PlayerScore
                  name={player.name}
                  daresDone={player.daresDone}
                  drinks={player.drinks}
                  isBoldest={summary.boldest === index}
                />
              </View>
            ))}
          </View>
          <View
            accessibilityLiveRegion="polite"
            className="rounded-lg border-2 border-border bg-surface p-12"
          >
            <Text className="type-body-bold text-foreground">
              {summary.boldest === 'tie'
                ? copy.roundSummary.tieLine
                : fillCopy(copy.roundSummary.boldestLine, {
                    name: summary.players[summary.boldest].name,
                  })}
            </Text>
          </View>
        </>
      ) : null}

      <View className="flex-1" />

      <View className="gap-12">
        <Button
          label={copy.roundSummary.playAgain}
          fullWidth
          disabled={!lastStart}
          onPress={playAgain}
        />
        <View className="flex-row gap-12">
          <View className="flex-1">
            <Button
              label={copy.roundSummary.settings}
              variant="secondary"
              fullWidth
              onPress={openSettings}
            />
          </View>
          <View className="flex-1">
            <Button label={copy.roundSummary.home} variant="secondary" fullWidth onPress={goHome} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
