import { copy, fillCopy } from '@getfreak/content';
import {
  isQuestionRoundOver,
  summariseQuestionRound,
  type QuestionRoundState,
  type QuestionRoundSummary,
} from '@getfreak/core';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Character, Screen } from '../../../components/ui';
import { useDiscoveries, usePersonalData } from '../../../personal';
import { randomSeed } from '../../roundSetup/randomSeed';
import { useQuestionRound } from '../../questionRound/QuestionRoundProvider';
import { LineBox } from '../../questionsPlay/LineBox';
import { discoveriesRoute } from '../discoveriesRoute';
import { QuestionPlayerScore } from '../QuestionPlayerScore';

const homeRoute = '/games/questions';
const setupRoute = '/games/questions/setup';
const playRoute = '/games/questions/play';

// A round state is replaced by a new object on every action, so the finished round is one object.
// Remembering it here means a render, an effect that runs again or a screen that mounts again for
// the same round never saves its discoveries twice.
const savedRounds = new WeakSet<QuestionRoundState>();

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

function theoLineFor(summary: QuestionRoundSummary): string {
  if (summary.knowsBest === 'tie') return copy.questionsSummary.tieLine;
  if (summary.knowsBest === null) return copy.questionsSummary.noGuessLine;
  return fillCopy(copy.questionsSummary.knowsBestLine, {
    name: summary.players[summary.knowsBest].name,
  });
}

function theoMoodFor(summary: QuestionRoundSummary) {
  if (summary.knowsBest === 'tie') return 'shocked';
  if (summary.knowsBest === null) return 'idle';
  return 'happy';
}

/**
 * The end of a Drink If round: each player's drinks and guesses right, who knows the other best, how
 * often the couple matched, and the discoveries the round made, which are saved here once. Nothing
 * on it is logged. The round and the setup it came from live in the question round context, which
 * leaving the route group discards.
 */
export function QuestionsSummaryScreen() {
  const router = useRouter();
  const { round, lastStart, startNewRound } = useQuestionRound();
  const { isLoading, saveDiscoveries, addDiscoveries } = useDiscoveries();
  const { loadFailed } = usePersonalData();
  const [writeFailed, setWriteFailed] = useState(false);
  const summary = useMemo(() => (round ? summariseQuestionRound(round) : undefined), [round]);

  // Saved once for the round, after the store has opened, because a write to the placeholder store
  // before that is lost. The round counts as saved when the write starts, so a failed save is not
  // retried. Whether saving is on is the hook's to decide.
  useEffect(() => {
    if (isLoading || !round || !summary || !isQuestionRoundOver(round) || savedRounds.has(round)) {
      return;
    }
    savedRounds.add(round);
    // A store that could not open is an empty stand-in that keeps nothing, so nothing is written.
    if (summary.discoveries.length === 0 || loadFailed) return;
    addDiscoveries(summary.discoveries).catch(() => setWriteFailed(true));
  }, [isLoading, loadFailed, round, summary, addDiscoveries]);

  // Setup is under this screen, so going back to it is how Settings opens it. A deep link has
  // nothing behind it, so it falls back to setup.
  const openSettings = () => (router.canGoBack() ? router.back() : router.replace(setupRoute));

  // Pressing twice must not start two rounds. The play screen replaces this one.
  const hasStarted = useRef(false);
  const playAgain = () => {
    if (!lastStart || hasStarted.current) return;
    hasStarted.current = true;
    startNewRound({ ...lastStart.setup, seed: randomSeed() }, lastStart.questions);
    router.replace(playRoute);
  };

  // The round stays in the route group's context until the group is left, and the next start
  // replaces it.
  const goHome = () => router.dismissTo(homeRoute);

  // Held in a local so the narrowing below reaches the press handler.
  const discoveriesHref = discoveriesRoute;
  const discoveryCount = summary?.discoveries.length ?? 0;
  // With saving on, a round that made discoveries that were not kept says so.
  const hasDiscoveries = saveDiscoveries && discoveryCount > 0;
  const saveFailed = hasDiscoveries && (writeFailed || loadFailed);
  const showDiscoveries = hasDiscoveries && !saveFailed;
  const discoveriesTitle = fillCopy(
    plural(
      discoveryCount,
      copy.questionsSummary.discoveriesOne,
      copy.questionsSummary.discoveriesMany,
    ),
    { count: discoveryCount },
  );

  return (
    <Screen scroll>
      <View className="gap-4">
        <Text accessibilityRole="header" className="type-title text-center text-foreground">
          {copy.questionsSummary.title}
        </Text>
        {summary ? (
          <Text className="type-body-bold text-center text-muted">
            {fillCopy(copy.questionsSummary.subtitle, {
              questions: fillCopy(
                plural(
                  summary.questionsPlayed,
                  copy.questionsSummary.questionCountOne,
                  copy.questionsSummary.questionCountMany,
                ),
                { count: summary.questionsPlayed },
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
                <QuestionPlayerScore
                  name={player.name}
                  drinks={player.drinks}
                  guessesRight={player.guessesRight}
                  guessesMade={player.guessesMade}
                  knowsBest={summary.knowsBest === index}
                />
              </View>
            ))}
          </View>

          <View className="flex-row items-center gap-12">
            <Character character="shy" mood={theoMoodFor(summary)} size="tile" crop="head" />
            <View className="flex-1" accessibilityLiveRegion="polite">
              <LineBox>{theoLineFor(summary)}</LineBox>
            </View>
          </View>

          {summary.eitherOrPlayed > 0 ? (
            <Text className="type-body-bold text-center text-muted">
              {fillCopy(
                plural(
                  summary.eitherOrPlayed,
                  copy.questionsSummary.matchesLineOne,
                  copy.questionsSummary.matchesLineMany,
                ),
                { matched: summary.eitherOrMatched, played: summary.eitherOrPlayed },
              )}
            </Text>
          ) : null}

          {showDiscoveries && discoveriesHref !== null ? (
            <Card label={discoveriesTitle} onPress={() => router.push(discoveriesHref)}>
              <View className="gap-4">
                <Text className="type-heading text-foreground">{discoveriesTitle}</Text>
                <Text className="type-body text-muted">
                  {copy.questionsSummary.discoveriesBody}
                </Text>
              </View>
            </Card>
          ) : null}
          {showDiscoveries && discoveriesHref === null ? (
            <Card>
              <Text className="type-heading text-foreground">{discoveriesTitle}</Text>
            </Card>
          ) : null}
          {saveFailed ? (
            <View accessibilityLiveRegion="polite">
              <LineBox>{copy.questionsSummary.saveFailed}</LineBox>
            </View>
          ) : null}
        </>
      ) : null}

      <View className="gap-12">
        <Button
          label={copy.questionsSummary.playAgain}
          fullWidth
          disabled={!lastStart}
          onPress={playAgain}
        />
        <View className="flex-row gap-12">
          <View className="flex-1">
            <Button
              label={copy.questionsSummary.settings}
              variant="secondary"
              fullWidth
              onPress={openSettings}
            />
          </View>
          <View className="flex-1">
            <Button
              label={copy.questionsSummary.home}
              variant="secondary"
              fullWidth
              onPress={goHome}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
