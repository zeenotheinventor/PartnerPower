import { limits, surpriseIds } from '@getfreak/core';

import { copy } from './copy';
import { hasDashOrSemicolon } from './textRules';

function expectEveryValueToBeText(group: Record<string, string>) {
  Object.values(group).forEach((value) => expect(value.trim()).not.toBe(''));
}

describe('copy', () => {
  it('should name the app', () => {
    expect(copy.appName).toBe('Get Freak');
  });

  it('should give the hub every line as non-empty text', () => {
    expect(Object.keys(copy.hub).sort()).toEqual(['comingSoon', 'greeting', 'settings'].sort());
    expectEveryValueToBeText(copy.hub);
  });

  it('should give the update toast every line as non-empty text', () => {
    expect(Object.keys(copy.updateToast).sort()).toEqual(['dismissHint', 'message']);
    expectEveryValueToBeText(copy.updateToast);
  });

  it('should give the settings screen every line as non-empty text', () => {
    expect(Object.keys(copy.settings).sort()).toEqual(
      [
        'backLabel',
        'soundsCaption',
        'soundsLabel',
        'title',
        'vibrationCaption',
        'vibrationLabel',
      ].sort(),
    );
    expectEveryValueToBeText(copy.settings);
  });

  it('should give the round setup screen every line as non-empty text', () => {
    expect(Object.keys(copy.roundSetup).sort()).toEqual(
      [
        'backLabel',
        'categoriesLabel',
        'lastCategoryHint',
        'lengthEndless',
        'lengthLabel',
        'lengthTen',
        'lengthTwenty',
        'levelLabel',
        'mixInMyDares',
        'myDaresCount',
        'myDaresLabel',
        'myDaresNone',
        'myDaresRowName',
        'playerOneLabel',
        'playerTwoLabel',
        'start',
        'surprises',
        'surprisesCaption',
        'title',
      ].sort(),
    );
    expectEveryValueToBeText(copy.roundSetup);
  });

  it('should give the shared kit lines as non-empty text', () => {
    expect(Object.keys(copy.ui)).toEqual(['characterCount']);
    expectEveryValueToBeText(copy.ui);
  });

  it('should give the My dares screens every line as non-empty text', () => {
    expect(Object.keys(copy.ownCards).sort()).toEqual(
      [
        'add',
        'backLabel',
        'categoryLabel',
        'deleteButton',
        'deleteCancel',
        'deleteConfirm',
        'deleteBody',
        'deleteTitle',
        'duplicateError',
        'editorTitle',
        'emptyError',
        'emptyList',
        'fieldLabel',
        'groupHeading',
        'kindLabel',
        'kindSolo',
        'kindTogether',
        'limit',
        'listTitle',
        'notice',
        'save',
        'togetherCardLabel',
        'tooLongError',
        'writeFailed',
      ].sort(),
    );
    expectEveryValueToBeText(copy.ownCards);
  });

  it('should word the dare limit and the length message with the numbers the rules use', () => {
    expect(copy.ownCards.limit).toContain(String(limits.playerCards));
    expect(copy.ownCards.tooLongError).toContain(String(limits.cardTextLength));
  });

  it('should give the Drink If home every line as non-empty text', () => {
    expect(Object.keys(copy.questionsHome).sort()).toEqual(
      [
        'backLabel',
        'discoveriesBody',
        'discoveriesTitle',
        'matchBody',
        'matchTitle',
        'ownBody',
        'ownTitle',
        'playBody',
        'playTitle',
        'subtitle',
        'theoLine',
        'title',
      ].sort(),
    );
    expectEveryValueToBeText(copy.questionsHome);
  });

  it('should give the Drink If setup every line as non-empty text', () => {
    expect(Object.keys(copy.questionsSetup).sort()).toEqual(
      [
        'backLabel',
        'formatsLabel',
        'lastFormatHint',
        'lastTopicHint',
        'lengthEndless',
        'lengthLabel',
        'lengthTen',
        'lengthTwenty',
        'start',
        'title',
        'tooFew',
        'topicsLabel',
      ].sort(),
    );
    expectEveryValueToBeText(copy.questionsSetup);
  });

  it('should give the Drink If round screen every line as non-empty text', () => {
    expect(Object.keys(copy.questionsPlay).sort()).toEqual(
      [
        'answerChip',
        'answers',
        'backLabel',
        'bothNames',
        'drinksChip',
        'drinksResult',
        'guessChip',
        'guessHandoffLine',
        'guessTitle',
        'have',
        'lockedChip',
        'lockedIn',
        'matchLine',
        'never',
        'nextQuestion',
        'no',
        'noMatchLine',
        'noQuestions',
        'onlyLooks',
        'penaltyEitherOr',
        'penaltyGuess',
        'penaltyIfYou',
        'penaltyNeverHave',
        'pickPrivate',
        'picks',
        'questionCount',
        'questionCountEndless',
        'readAloud',
        'reads',
        'resultLabel',
        'rightLine',
        'safeChip',
        'safeResult',
        'showWhoDrinks',
        'skipBody',
        'skipTitle',
        'stepUpCost',
        'stepUpLine',
        'stepUpLineBold',
        'summaryStandInHome',
        'summaryStandInLine',
        'summaryStandInTitle',
        'title',
        'wrongLine',
        'yes',
      ].sort(),
    );
    expectEveryValueToBeText(copy.questionsPlay);
  });

  it('should keep the Drink If round lines free of dashes and semicolons', () => {
    Object.values(copy.questionsPlay).forEach((line) =>
      expect(hasDashOrSemicolon(line)).toBe(false),
    );
  });

  it('should give the secret match screens every line as non-empty text', () => {
    expect(Object.keys(copy.secretMatch).sort()).toEqual(
      [
        'back',
        'backLabel',
        'count',
        'coverBody',
        'coverTitle',
        'daresBody',
        'daresTitle',
        'done',
        'handoffButton',
        'handoffLine',
        'handoffTitle',
        'how1',
        'how2',
        'how3',
        'howLabel',
        'lookAway',
        'maybe',
        'no',
        'noneBody',
        'noneTheo',
        'noneTitle',
        'passOf',
        'promiseBody',
        'promiseTitle',
        'revealCountMany',
        'revealCountOne',
        'revealTheo',
        'revealTitle',
        'saved',
        'savingOff',
        'start',
        'stop',
        'stopBody',
        'stopCancel',
        'stopConfirm',
        'stopTitle',
        'strengthMaybe',
        'strengthYes',
        'theoLine',
        'title',
        'tooFew',
        'yes',
        'yourAnswer',
      ].sort(),
    );
    expectEveryValueToBeText(copy.secretMatch);
  });

  it('should keep the secret match lines free of dashes and semicolons', () => {
    Object.values(copy.secretMatch).forEach((line) => expect(hasDashOrSemicolon(line)).toBe(false));
  });

  it('should give the round screen every line as non-empty text', () => {
    expect(Object.keys(copy.roundPlay).sort()).toEqual(
      [
        'backLabel',
        'bothOfYou',
        'choicePrompt',
        'countdownLabel',
        'countdownSecondsMany',
        'countdownSecondsOne',
        'faceDownLabel',
        'faceDownMark',
        'flip',
        'flippedPenalty',
        'freePassMarker',
        'freePassUsed',
        'surpriseButton',
        'surpriseRule',
        'surpriseTitle',
        'timerDone',
        'timerRunning',
        'useFreePass',
        'vibrationBlocked',
        'vibrationGo',
        'vibrationStop',
        'cardCount',
        'cardCountEndless',
        'done',
        'endDialogBody',
        'endDialogCancel',
        'endDialogConfirm',
        'endDialogTitle',
        'endRound',
        'handoffButton',
        'handoffLine',
        'handoffTitle',
        'noCards',
        'notThisOne',
        'pass',
        'penalty',
        'penaltyTogether',
        'sheetClose',
        'sheetTitle',
        'skipBody',
        'skipTitle',
        'stepUpButton',
        'stepUpCost',
        'stepUpLine',
        'stepUpTitle',
        'switchOffLabel',
        'switchedOffHint',
        'title',
        'togetherChip',
        'togetherDone',
        'togetherNames',
        'togetherPass',
        'turnOf',
      ].sort(),
    );
    const { surpriseRule, ...lines } = copy.roundPlay;
    expectEveryValueToBeText(lines);
    expectEveryValueToBeText(surpriseRule);
  });

  it('should give every surprise a rule line', () => {
    expect(Object.keys(copy.roundPlay.surpriseRule).sort()).toEqual([...surpriseIds].sort());
  });

  it("should keep the free pass rule to one of the player's own cards", () => {
    expect(copy.roundPlay.surpriseRule.freePass).toContain('skip one of your cards');
  });

  it('should give the summary screen every line as non-empty text', () => {
    expect(Object.keys(copy.roundSummary).sort()).toEqual(
      [
        'boldestBadge',
        'boldestLine',
        'cardCountMany',
        'cardCountOne',
        'categoryCountMany',
        'categoryCountOne',
        'daresDoneMany',
        'daresDoneOne',
        'doneLabel',
        'drinkLabelMany',
        'drinkLabelOne',
        'drinksMany',
        'drinksOne',
        'favouriteSaveFailed',
        'home',
        'playAgain',
        'playedHeading',
        'playerSummary',
        'playerSummaryBoldest',
        'settings',
        'subtitle',
        'tieLine',
        'title',
      ].sort(),
    );
    expectEveryValueToBeText(copy.roundSummary);
  });

  it('should give the favourite control its name as non-empty text', () => {
    expect(Object.keys(copy.favourite)).toEqual(['label']);
    expectEveryValueToBeText(copy.favourite);
  });

  it('should give the welcome screen every line as non-empty text', () => {
    expect(Object.keys(copy.welcome).sort()).toEqual(
      ['confirmLabel', 'declineLabel', 'greeting', 'note', 'question'].sort(),
    );
    expectEveryValueToBeText(copy.welcome);
  });

  it('should give the closing screen every line as non-empty text', () => {
    expect(Object.keys(copy.welcomeDeclined).sort()).toEqual(
      ['backLabel', 'body', 'greeting', 'title'].sort(),
    );
    expectEveryValueToBeText(copy.welcomeDeclined);
  });

  it('should give the three leads as non-empty text, with none for the other formats', () => {
    expect(Object.keys(copy.questionLeads).sort()).toEqual(['eitherOr', 'ifYou', 'neverHave']);
    expectEveryValueToBeText(copy.questionLeads);
  });

  it('should word the leads as the game shows them', () => {
    expect(copy.questionLeads).toEqual({
      ifYou: 'Drink if',
      neverHave: 'Never have I ever',
      eitherOr: 'Would you rather',
    });
  });
});
