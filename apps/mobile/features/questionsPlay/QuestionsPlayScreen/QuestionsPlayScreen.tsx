import { categoryNames, copy, fillCopy, topicNames } from '@getfreak/content';
import {
  categories,
  isQuestionRoundOver,
  questionTurnView,
  type CategoryId,
  type QuestionRoundState,
  type QuestionTurnView,
} from '@getfreak/core';
import { useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Header, Screen } from '../../../components/ui';
import { useQuestionRound } from '../../questionRound/QuestionRoundProvider';
import { EndRoundDialog } from '../../roundPlay/EndRoundDialog';
import { HandoffView } from '../../roundPlay/HandoffView';
import { NotThisOneSheet } from '../../roundPlay/NotThisOneSheet';
import { SteppingUpView } from '../../roundPlay/SteppingUpView';
import { isBoldCategory } from '../isBoldCategory';
import { PickView } from '../PickView';
import { penaltyLineOf, promptOf } from '../questionCopy';
import { RevealView } from '../RevealView';
import { StatementView } from '../StatementView';
import type { TurnChrome } from '../TurnFrame';

const setupRoute = '/games/questions/setup';
const summaryRoute = '/games/questions/summary';

type Stage = 'steppingUp' | 'handoff' | 'question';

function penaltyOf(category: CategoryId) {
  return categories.find((candidate) => candidate.id === category)?.penalty ?? 0;
}

function previousHolderOf(round: QuestionRoundState) {
  return round.history.at(-1)?.holder;
}

function holderChanges(round: QuestionRoundState, view: QuestionTurnView) {
  const previousHolder = previousHolderOf(round);
  return previousHolder === undefined || previousHolder !== view.holder;
}

// Which screen comes first for the question in play. A step up is announced first, then the phone
// is passed if the player holding it changed, and then the question shows.
function firstStage(round: QuestionRoundState, view: QuestionTurnView): Stage {
  if (view.steppingUp) return 'steppingUp';
  return holderChanges(round, view) ? 'handoff' : 'question';
}

/**
 * The screen for a Drink If round in play. It holds no rules: it reads the turn view of the round
 * and sends the engine's actions. Each question can come with a step up screen and a pass the phone
 * screen first, and a guess question passes the phone again to the guesser. They are state of this
 * screen, not routes. The turn view leaves out the holder's first pick, so nothing here can show
 * it. Nothing here logs, and no name or question text leaves the screen.
 */
export function QuestionsPlayScreen() {
  const router = useRouter();
  const { round, dispatch } = useQuestionRound();
  const view = round ? questionTurnView(round) : null;
  const questionNumber = round ? round.history.length + 1 : 0;

  // The stage is kept with the question number it belongs to, so a new question starts at its first
  // stage. A replacement question keeps the number, and so keeps the stage it was pinned to.
  const [stageState, setStageState] = useState<{ questionNumber: number; stage: Stage }>();
  const stage = stageState?.questionNumber === questionNumber ? stageState.stage : null;
  const showStage = (nextStage: Stage) => setStageState({ questionNumber, stage: nextStage });

  // The question whose guesser already has the phone. A replacement has another id, so the phone is
  // passed again.
  const [guesserHasPhoneFor, setGuesserHasPhoneFor] = useState<string>();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // A round that starts with no questions is over from the start and shows the no questions line.
  // Once a question has been in play, the round being over means it is time for the summary.
  const [hasPlayed, setHasPlayed] = useState(false);
  if (view && !hasPlayed) setHasPlayed(true);

  const isPlaying = view !== null;
  // While a question is in play, going back opens the dialog, or closes the sheet when it is open.
  // This is the hook the native stack reads, so the iOS swipe is stopped too.
  usePreventRemove(isPlaying, () => (isSheetOpen ? setIsSheetOpen(false) : setIsDialogOpen(true)));

  const isOverAfterPlaying = hasPlayed && round !== undefined && isQuestionRoundOver(round);
  useEffect(() => {
    if (isOverAfterPlaying) router.replace(summaryRoute);
  }, [isOverAfterPlaying, router]);

  // A replacement question stays on the question view. The player already holds the phone, and the
  // cost is on the card, so no step up screen comes first.
  const skipQuestion = () => {
    showStage('question');
    setIsSheetOpen(false);
    dispatch({ type: 'removeQuestion' });
  };

  const switchCategoryOff = (category: CategoryId) => {
    showStage('question');
    dispatch({ type: 'disableCategory', category });
  };

  const endRound = () => {
    setIsDialogOpen(false);
    dispatch({ type: 'end' });
  };

  // A deep link can open this screen with nothing behind it, so it falls back to setup.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(setupRoute));

  if (!round || !view) {
    if (isOverAfterPlaying) return null;
    return (
      <Screen>
        <Header
          title={copy.questionsPlay.title}
          backLabel={copy.questionsPlay.backLabel}
          onBack={goBack}
        />
        <Text className="type-body text-muted">{copy.questionsPlay.noQuestions}</Text>
      </Screen>
    );
  }

  const { question } = view;
  const holderName = round.players[view.holder];
  const otherName = round.players[view.other];
  const currentStage = stage ?? firstStage(round, view);
  const afterStepUp = () => showStage(holderChanges(round, view) ? 'handoff' : 'question');

  const frame: TurnChrome = {
    countLabel:
      round.length === 'endless'
        ? fillCopy(copy.questionsPlay.questionCountEndless, { number: questionNumber })
        : fillCopy(copy.questionsPlay.questionCount, {
            number: questionNumber,
            length: round.length,
          }),
    progress:
      round.length === 'endless' ? undefined : { number: questionNumber, length: round.length },
    category: question.category,
    categoryName: categoryNames[question.category],
    topicName: topicNames[question.topic],
    prompt: promptOf(question),
    penaltyLine: penaltyLineOf(question.format, penaltyOf(question.category), otherName),
    onEndRound: () => setIsDialogOpen(true),
  };

  let content;
  if (currentStage === 'steppingUp') {
    const isBold = isBoldCategory(question.category);
    content = (
      <SteppingUpView
        category={question.category}
        categoryName={categoryNames[question.category]}
        penalty={penaltyOf(question.category)}
        line={isBold ? copy.questionsPlay.stepUpLineBold : copy.questionsPlay.stepUpLine}
        costLine={fillCopy(copy.questionsPlay.stepUpCost, {
          penalty: penaltyOf(question.category),
        })}
        character={{ character: 'shy', mood: isBold ? 'flustered' : 'happy' }}
        onContinue={afterStepUp}
      />
    );
  } else if (currentStage === 'handoff') {
    const previousHolder = previousHolderOf(round);
    content = (
      <HandoffView
        name={holderName}
        previousName={previousHolder === undefined ? undefined : round.players[previousHolder]}
        onContinue={() => showStage('question')}
      />
    );
  } else if (view.stage === 'revealed' && view.reveal) {
    content = (
      <RevealView
        frame={frame}
        question={question}
        reveal={view.reveal}
        playerNames={round.players}
        holder={view.holder}
        onNext={() => dispatch({ type: 'next' })}
      />
    );
  } else if (question.format === 'ifYou' || question.format === 'neverHave') {
    // Keyed by the question, so a replacement starts with no answers.
    content = (
      <StatementView
        key={question.id}
        frame={frame}
        format={question.format}
        playerNames={round.players}
        readerName={holderName}
        mood="idle"
        onShowWhoDrinks={(answers) => dispatch({ type: 'answer', answers })}
        onNotThisOne={() => setIsSheetOpen(true)}
      />
    );
  } else if (question.format === 'guess' && view.pickLocked && guesserHasPhoneFor !== question.id) {
    content = (
      <HandoffView
        name={otherName}
        line={fillCopy(copy.questionsPlay.guessHandoffLine, {
          name: otherName,
          partner: holderName,
        })}
        onContinue={() => setGuesserHasPhoneFor(question.id)}
      />
    );
  } else {
    content = (
      <PickView
        key={question.id}
        frame={frame}
        format={question.format}
        stage={view.pickLocked ? 'secondPick' : 'answering'}
        holderName={holderName}
        otherName={otherName}
        options={question.options}
        onPick={(optionId) => dispatch({ type: 'pick', optionId })}
        onNotThisOne={() => setIsSheetOpen(true)}
      />
    );
  }

  return (
    <View className="flex-1">
      {content}
      <NotThisOneSheet
        visible={isSheetOpen}
        categories={round.pacing.map((category) => ({
          category,
          name: categoryNames[category],
          isOn: round.enabled.includes(category),
        }))}
        skipTitle={copy.questionsPlay.skipTitle}
        skipHint={copy.questionsPlay.skipBody}
        onSkip={skipQuestion}
        onSwitchOff={switchCategoryOff}
        onClose={() => setIsSheetOpen(false)}
      />
      <EndRoundDialog
        visible={isDialogOpen}
        onConfirm={endRound}
        onCancel={() => setIsDialogOpen(false)}
      />
    </View>
  );
}
