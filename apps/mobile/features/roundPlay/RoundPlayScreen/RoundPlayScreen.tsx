import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { categories, isRoundOver, type RoundState } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Header, Screen } from '../../../components/ui';
import { useRound } from '../../round/RoundProvider';
import { EndRoundDialog } from '../EndRoundDialog';
import { HandoffView } from '../HandoffView';
import { SteppingUpView } from '../SteppingUpView';
import { TurnView } from '../TurnView';

const setupRoute = '/games/dares/setup';
const summaryRoute = '/games/dares/summary';

type Stage = 'steppingUp' | 'handoff' | 'card';

function penaltyOf(category: string) {
  return categories.find((candidate) => candidate.id === category)?.penalty ?? 0;
}

// Which screen comes first for the card in play. A step up is announced first, then the phone is
// passed if the player holding it changed, and then the card shows.
function firstStage(round: RoundState): Stage {
  const { current } = round;
  if (current?.steppingUp) return 'steppingUp';
  return phoneChanges(round) ? 'handoff' : 'card';
}

function previousPlayerOf(round: RoundState) {
  return round.history.at(-1)?.player;
}

function phoneChanges(round: RoundState) {
  const previousPlayer = previousPlayerOf(round);
  return previousPlayer === undefined || previousPlayer !== round.current?.player;
}

/**
 * The screen for a round in play. Each card can come with a step up screen and a pass the phone
 * screen first. They are state of this screen, not routes. Nothing here logs, and no name or card
 * text leaves the screen.
 */
export function RoundPlayScreen() {
  const router = useRouter();
  const { round, dispatch } = useRound();
  const current = round?.current ?? null;
  const cardNumber = round ? round.history.length + 1 : 0;

  // The stage is kept with the card number it belongs to, so a new card starts at its first stage.
  const [stageState, setStageState] = useState<{ cardNumber: number; stage: Stage }>();
  const stage = round && stageState?.cardNumber === cardNumber ? stageState.stage : null;
  const currentStage = stage ?? (round ? firstStage(round) : 'card');
  const showStage = (nextStage: Stage) => setStageState({ cardNumber, stage: nextStage });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // A round that starts with no cards is over from the start and shows the no cards line. Once a
  // card has been in play, the round being over means it is time for the summary.
  const [hasPlayed, setHasPlayed] = useState(false);
  if (current && !hasPlayed) setHasPlayed(true);

  const isPlaying = current !== null;
  // While a card is in play, going back opens the dialog. This is the hook the native stack reads,
  // so the iOS swipe is stopped too, and not only the Android back button.
  usePreventRemove(isPlaying, () => setIsDialogOpen(true));

  const isOverAfterPlaying = hasPlayed && round !== undefined && isRoundOver(round);
  useEffect(() => {
    if (isOverAfterPlaying) router.replace(summaryRoute);
  }, [isOverAfterPlaying, router]);

  const endRound = () => {
    setIsDialogOpen(false);
    dispatch({ type: 'end' });
  };

  // A deep link can open this screen with nothing behind it, so it falls back to setup.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(setupRoute));

  if (!round || !current) {
    if (isOverAfterPlaying) return null;
    return (
      <Screen>
        <Header title={copy.roundPlay.title} backLabel={copy.roundPlay.backLabel} onBack={goBack} />
        <Text className="type-body text-muted">{copy.roundPlay.noCards}</Text>
      </Screen>
    );
  }

  const holderName = round.players[current.player];
  const { card } = current;
  const categoryName = categoryNames[card.category];
  const penalty = penaltyOf(card.category);
  const isTogether = card.kind === 'together';
  const afterStepUp = () => showStage(phoneChanges(round) ? 'handoff' : 'card');

  let view;
  if (currentStage === 'steppingUp') {
    view = (
      <SteppingUpView
        category={card.category}
        categoryName={categoryName}
        penalty={penalty}
        onContinue={afterStepUp}
      />
    );
  } else if (currentStage === 'handoff') {
    const previousPlayer = previousPlayerOf(round);
    view = (
      <HandoffView
        name={holderName}
        previousName={previousPlayer === undefined ? undefined : round.players[previousPlayer]}
        onContinue={() => showStage('card')}
      />
    );
  } else {
    view = (
      <TurnView
        turnLabel={
          isTogether
            ? copy.roundPlay.bothOfYou
            : fillCopy(copy.roundPlay.turnOf, { name: holderName })
        }
        countLabel={
          round.length === 'endless'
            ? fillCopy(copy.roundPlay.cardCountEndless, { number: cardNumber })
            : fillCopy(copy.roundPlay.cardCount, { number: cardNumber, length: round.length })
        }
        progress={
          round.length === 'endless' ? undefined : { number: cardNumber, length: round.length }
        }
        category={card.category}
        categoryName={categoryName}
        text={card.text}
        penaltyLine={fillCopy(
          isTogether ? copy.roundPlay.penaltyTogether : copy.roundPlay.penalty,
          { penalty },
        )}
        onDone={() => dispatch({ type: 'done' })}
        onPass={() => dispatch({ type: 'pass' })}
        onEndRound={() => setIsDialogOpen(true)}
      />
    );
  }

  return (
    <>
      {view}
      <EndRoundDialog
        visible={isDialogOpen}
        onConfirm={endRound}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  );
}
