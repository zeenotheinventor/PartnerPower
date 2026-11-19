import { categoryNames, copy, fillCopy, surpriseNames } from '@getfreak/content';
import {
  categories,
  isRoundOver,
  type CategoryId,
  type CurrentCard,
  type PlayerIndex,
  type RoundState,
} from '@getfreak/core';
import { useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Header, Screen } from '../../../components/ui';
import { useFeedback } from '../../../feedback/FeedbackProvider';
import { useRound } from '../../round/RoundProvider';
import { ChoiceView } from '../ChoiceView';
import { EndRoundDialog } from '../EndRoundDialog';
import { HandoffView } from '../HandoffView';
import { NotThisOneSheet } from '../NotThisOneSheet';
import { isPlayableSurprise, type PlayableSurpriseId } from '../playableSurprises';
import {
  PressEffectLayer,
  type ButtonBounds,
  type PressEffect,
  type PressEffectKind,
} from '../pressEffect';
import { SteppingUpView } from '../SteppingUpView';
import { SurpriseView } from '../SurpriseView';
import { TurnView } from '../TurnView';

const setupRoute = '/games/dares/setup';
const summaryRoute = '/games/dares/summary';

type Stage = 'steppingUp' | 'surprise' | 'handoff' | 'choice' | 'card';

function penaltyOf(category: string) {
  return categories.find((candidate) => candidate.id === category)?.penalty ?? 0;
}

/** The surprise on the card in play, if it is one this screen can show. */
function shownSurpriseOf(current: CurrentCard | null): PlayableSurpriseId | undefined {
  const type = current?.surprise?.type;
  return type !== undefined && isPlayableSurprise(type) ? type : undefined;
}

// Which screen comes first for the card in play. A step up is announced first, then the surprise
// is revealed, then the phone is passed if the player holding it changed, and then the card shows.
// A category jump is revealed in place of the step up, because its reveal says the same thing. So
// is a mystery dare that has not been flipped, because the step up would name the category the card
// hides and show a cost that is one short.
function firstStage(round: RoundState): Stage {
  const { current } = round;
  const surprise = current?.surprise;
  const isUnflippedMystery = surprise?.type === 'mystery' && !surprise.flipped;
  if (shownSurpriseOf(current) === 'jump' || isUnflippedMystery) return 'surprise';
  return current?.steppingUp ? 'steppingUp' : stageAfterStepUp(round);
}

function stageAfterStepUp(round: RoundState): Stage {
  return shownSurpriseOf(round.current) ? 'surprise' : stageAfterSurprise(round);
}

// A partner's choice goes to the chooser, who is passed the phone only when they do not hold it. The
// player is passed it after the pick, always, because the chooser has seen the dare that was not
// picked.
function stageAfterSurprise(round: RoundState): Stage {
  const { surprise } = round.current ?? {};
  if (surprise?.type === 'choice' && surprise.chosen === null) {
    return phoneChangesTo(round, surprise.chooser) ? 'handoff' : 'choice';
  }
  return phoneChangesTo(round, round.current?.player) ? 'handoff' : 'card';
}

function previousPlayerOf(round: RoundState) {
  return round.history.at(-1)?.player;
}

function phoneChangesTo(round: RoundState, receiver: PlayerIndex | undefined) {
  const previousPlayer = previousPlayerOf(round);
  return previousPlayer === undefined || previousPlayer !== receiver;
}

type Handoff = {
  receiver: PlayerIndex;
  /** The player who is told to look away. Nobody holds the phone before the first card. */
  lookingAway: PlayerIndex | undefined;
  next: Stage;
};

/**
 * Who the phone goes to on the pass the phone screen. Before a partner's choice is picked it goes
 * to the chooser, and after it to the player, with the chooser told to look away.
 */
function handoffOf(round: RoundState, current: CurrentCard): Handoff {
  const { surprise } = current;
  if (surprise?.type === 'choice') {
    return surprise.chosen === null
      ? { receiver: surprise.chooser, lookingAway: previousPlayerOf(round), next: 'choice' }
      : { receiver: current.player, lookingAway: surprise.chooser, next: 'card' };
  }
  return { receiver: current.player, lookingAway: previousPlayerOf(round), next: 'card' };
}

/** The rule line of a surprise, filled with the name of the player it is for, the category and the cost. */
function surpriseRuleOf(
  surprise: PlayableSurpriseId,
  values: { name: string; chooser: string; category: string; penalty: number },
) {
  switch (surprise) {
    case 'mystery':
      return copy.roundPlay.surpriseRule.mystery;
    case 'jump':
      return fillCopy(copy.roundPlay.surpriseRule.jump, {
        category: values.category,
        penalty: values.penalty,
      });
    case 'swap':
      return fillCopy(copy.roundPlay.surpriseRule.swap, { name: values.name });
    case 'choice':
      return fillCopy(copy.roundPlay.surpriseRule.choice, {
        chooser: values.chooser,
        name: values.name,
      });
    case 'timer':
      return copy.roundPlay.surpriseRule.timer;
    case 'freePass':
      return fillCopy(copy.roundPlay.surpriseRule.freePass, { name: values.name });
  }
}

/**
 * The screen for a round in play. Each card can come with a step up screen, a surprise reveal and a
 * pass the phone screen first. They are state of this screen, not routes. Nothing here logs, and no name or card
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
  // The card number that the free pass confirmation belongs to, which is the card after the one the
  // pass was used on. It shows on the first screen of that card and goes once the player moves on.
  const [freePassNoticeCardNumber, setFreePassNoticeCardNumber] = useState<number>();
  const showStage = (nextStage: Stage) => {
    setFreePassNoticeCardNumber(undefined);
    setStageState({ cardNumber, stage: nextStage });
  };
  const notice = freePassNoticeCardNumber === cardNumber ? copy.roundPlay.freePassUsed : undefined;

  // The effect of the answer button that was pressed, drawn over whichever view is showing. A new
  // press replaces the one still playing, so effects never stack.
  const hostRef = useRef<View>(null);
  const effectCount = useRef(0);
  const [pressEffect, setPressEffect] = useState<PressEffect>();
  const category = current?.card.category;
  const playPressEffect = (kind: PressEffectKind, buttonInWindow: ButtonBounds) => {
    if (!category) return;
    // The button is measured in the window, and the layer draws from the corner of this view.
    hostRef.current?.measureInWindow((hostX, hostY) => {
      effectCount.current += 1;
      setPressEffect({
        key: effectCount.current,
        kind,
        category,
        bounds: { ...buttonInWindow, x: buttonInWindow.x - hostX, y: buttonInWindow.y - hostY },
      });
    });
  };
  const finishPressEffect = useCallback(
    (key: number) => setPressEffect((playing) => (playing?.key === key ? undefined : playing)),
    [],
  );

  // Each view that shows has its own sound: the step up sting, which a surprise reveal shares, the
  // hand over chime, the soft rise of a choice put to the partner, and the deal for a card. The
  // card id is in the key so that a swapped card is dealt again on the same view.
  const { stepUp, handover, sheetOpen, deal } = useFeedback();
  const announce = {
    steppingUp: stepUp,
    surprise: stepUp,
    handoff: handover,
    choice: sheetOpen,
    card: deal,
  }[currentStage];
  const shownCardId = current?.card.id;
  useEffect(() => {
    if (shownCardId !== undefined) announce();
  }, [shownCardId, announce]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // A round that starts with no cards is over from the start and shows the no cards line. Once a
  // card has been in play, the round being over means it is time for the summary.
  const [hasPlayed, setHasPlayed] = useState(false);
  if (current && !hasPlayed) setHasPlayed(true);

  const isPlaying = current !== null;
  // While a card is in play, going back opens the dialog, or closes the sheet when it is open. This
  // is the hook the native stack reads, so the iOS swipe is stopped too, and not only the Android
  // back button.
  usePreventRemove(isPlaying, () => (isSheetOpen ? setIsSheetOpen(false) : setIsDialogOpen(true)));

  const isOverAfterPlaying = hasPlayed && round !== undefined && isRoundOver(round);
  useEffect(() => {
    if (isOverAfterPlaying) router.replace(summaryRoute);
  }, [isOverAfterPlaying, router]);

  // A new card in place of the one in play stays on the card view. The player already holds the
  // phone, and the cost is on the card itself, so no step up screen comes first.
  const skipCard = () => {
    showStage('card');
    setIsSheetOpen(false);
    dispatch({ type: 'removeCard' });
  };

  const switchCategoryOff = (category: CategoryId) => {
    showStage('card');
    dispatch({ type: 'disableCategory', category });
  };

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
  const kindProps = isTogether
    ? {
        kind: 'together' as const,
        togetherNames: fillCopy(copy.roundPlay.togetherNames, {
          first: round.players[0],
          second: round.players[1],
        }),
      }
    : { kind: 'solo' as const };
  const shownSurprise = shownSurpriseOf(current);
  const { surprise } = current;
  const chooserName = surprise?.type === 'choice' ? round.players[surprise.chooser] : '';
  const countLabel =
    round.length === 'endless'
      ? fillCopy(copy.roundPlay.cardCountEndless, { number: cardNumber })
      : fillCopy(copy.roundPlay.cardCount, { number: cardNumber, length: round.length });
  const progress =
    round.length === 'endless' ? undefined : { number: cardNumber, length: round.length };
  const isFaceDown = current.surprise?.type === 'mystery' && !current.surprise.flipped;
  // A free pass is for the player who holds it, on their own solo card, once the card is face up.
  const canUseFreePass = round.freePasses[current.player] && !isTogether && !isFaceDown;
  const useFreePass = () => {
    setFreePassNoticeCardNumber(cardNumber + 1);
    dispatch({ type: 'useFreePass' });
  };
  // The engine charges a drink more for passing a mystery dare, so its line says so once it is face up.
  const isPenaltyRaised = shownSurprise === 'mystery' && !isFaceDown;
  // The free pass has no chip on its card, because the pass belongs to the player. A mystery dare
  // has none until it is face up, because the chip would give away what it is.
  const chipSurprise = shownSurprise === 'freePass' || isFaceDown ? undefined : shownSurprise;

  let view;
  if (currentStage === 'steppingUp') {
    view = (
      <SteppingUpView
        category={card.category}
        categoryName={categoryName}
        penalty={penalty}
        notice={notice}
        onContinue={() => showStage(stageAfterStepUp(round))}
      />
    );
  } else if (currentStage === 'surprise' && shownSurprise) {
    view = (
      <SurpriseView
        surprise={shownSurprise}
        rule={surpriseRuleOf(shownSurprise, {
          name: holderName,
          chooser: chooserName,
          category: categoryName,
          penalty,
        })}
        turnLine={fillCopy(copy.roundPlay.turnOf, { name: holderName })}
        reachedCategory={shownSurprise === 'jump' ? card.category : undefined}
        notice={notice}
        onContinue={() => showStage(stageAfterSurprise(round))}
      />
    );
  } else if (currentStage === 'handoff') {
    const { receiver, lookingAway, next } = handoffOf(round, current);
    view = (
      <HandoffView
        name={round.players[receiver]}
        previousName={lookingAway === undefined ? undefined : round.players[lookingAway]}
        notice={notice}
        onContinue={() => showStage(next)}
      />
    );
  } else if (currentStage === 'choice' && surprise?.type === 'choice') {
    view = (
      <ChoiceView
        prompt={fillCopy(copy.roundPlay.choicePrompt, { name: holderName })}
        countLabel={countLabel}
        progress={progress}
        category={card.category}
        categoryName={categoryName}
        options={[surprise.options[0].text, surprise.options[1].text]}
        onChoose={(index) => {
          dispatch({ type: 'choose', index });
          showStage('handoff');
        }}
        onEndRound={() => setIsDialogOpen(true)}
      />
    );
  } else {
    view = (
      <TurnView
        key={cardNumber}
        turnLabel={
          isTogether
            ? copy.roundPlay.bothOfYou
            : fillCopy(copy.roundPlay.turnOf, { name: holderName })
        }
        countLabel={countLabel}
        progress={progress}
        category={card.category}
        categoryName={categoryName}
        text={card.text}
        penaltyLine={
          isPenaltyRaised
            ? fillCopy(copy.roundPlay.flippedPenalty, { penalty: penalty + 1 })
            : fillCopy(isTogether ? copy.roundPlay.penaltyTogether : copy.roundPlay.penalty, {
                penalty,
              })
        }
        isPenaltyRaised={isPenaltyRaised}
        surpriseName={chipSurprise ? surpriseNames[chipSurprise] : undefined}
        mystery={
          shownSurprise === 'mystery'
            ? { isFaceDown, onFlip: () => dispatch({ type: 'flip' }) }
            : undefined
        }
        freePass={canUseFreePass ? { onUse: useFreePass } : undefined}
        timer={surprise?.type === 'timer' ? { seconds: surprise.seconds } : undefined}
        vibration={card.effect?.type === 'vibrate' ? { seconds: card.effect.seconds } : undefined}
        cardTimer={
          card.effect === undefined && card.seconds !== undefined
            ? { seconds: card.seconds }
            : undefined
        }
        {...kindProps}
        onDone={() => dispatch({ type: 'done' })}
        onPass={() => dispatch({ type: 'pass' })}
        onEndRound={() => setIsDialogOpen(true)}
        onNotThisOne={() => setIsSheetOpen(true)}
        onPressEffect={playPressEffect}
      />
    );
  }

  return (
    // Not collapsable, because this view is measured and a view with no style of its own is
    // removed on Android.
    <View ref={hostRef} collapsable={false} className="flex-1">
      {view}
      <NotThisOneSheet
        visible={isSheetOpen}
        categories={round.pacing.map((category) => ({
          category,
          name: categoryNames[category],
          isOn: round.enabled.includes(category),
        }))}
        onSkip={skipCard}
        onSwitchOff={switchCategoryOff}
        onClose={() => setIsSheetOpen(false)}
      />
      <EndRoundDialog
        visible={isDialogOpen}
        onConfirm={endRound}
        onCancel={() => setIsDialogOpen(false)}
      />
      {pressEffect ? (
        <PressEffectLayer
          key={pressEffect.key}
          effect={pressEffect}
          onFinished={finishPressEffect}
        />
      ) : null}
    </View>
  );
}
