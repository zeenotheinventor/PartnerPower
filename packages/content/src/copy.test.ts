import { limits, surpriseIds } from '@getfreak/core';

import { copy } from './copy';
import { fillCopy } from './fillCopy';
import { hasBarredWord, hasDashOrSemicolon } from './textRules';

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
        'clearCaption',
        'clearLabel',
        'clearSection',
        'lockLabel',
        'lockOff',
        'lockOnPin',
        'playSection',
        'privacyLabel',
        'privacySection',
        'soundsCaption',
        'soundsLabel',
        'title',
        'version',
        'versionWithoutBuild',
        'vibrationCaption',
        'vibrationLabel',
      ].sort(),
    );
    expectEveryValueToBeText(copy.settings);
  });

  it('should give the privacy policy screen its back label', () => {
    expect(Object.keys(copy.privacy)).toEqual(['backLabel']);
    expectEveryValueToBeText(copy.privacy);
  });

  describe('clear everything', () => {
    it('should give the dialog every line as non-empty text', () => {
      const { removed, kept, ...lines } = copy.clear;
      expect(Object.keys(lines).sort()).toEqual(
        [
          'body',
          'cancel',
          'clearing',
          'confirm',
          'failed',
          'keptLabel',
          'removedLabel',
          'retry',
          'title',
        ].sort(),
      );
      expectEveryValueToBeText(lines);
      [...removed, ...kept].forEach((line) => expect(line.trim()).not.toBe(''));
    });

    it('should list what goes and what stays', () => {
      expect(copy.clear.removed.length).toBeGreaterThan(0);
      expect(copy.clear.kept.length).toBeGreaterThan(0);
    });

    it('should keep every line free of dashes and semicolons', () => {
      const { removed, kept, ...lines } = copy.clear;
      [...Object.values(lines), ...removed, ...kept].forEach((line) =>
        expect(hasDashOrSemicolon(line)).toBe(false),
      );
    });

    it('should show the version with its build number, and without when there is none', () => {
      expect(fillCopy(copy.settings.version, { version: '1.0.0', build: '12' })).toBe(
        'Version 1.0.0 (12)',
      );
      expect(fillCopy(copy.settings.versionWithoutBuild, { version: '1.0.0' })).toBe(
        'Version 1.0.0',
      );
    });
  });

  describe('app lock', () => {
    const biometricsKinds = [
      'faceId',
      'touchId',
      'fingerprint',
      'faceUnlock',
      'phoneUnlock',
    ] as const;

    it('should give the PIN pad its lines, with the count and the length to fill in', () => {
      expect(Object.keys(copy.pin).sort()).toEqual(['delete', 'dots']);
      expect(fillCopy(copy.pin.dots, { count: 2, length: 4 })).toBe('2 of 4 digits entered');
      expectEveryValueToBeText(copy.pin);
    });

    it('should give the lock setup screens every line as non-empty text', () => {
      const { points, ...lines } = copy.lockSetup;
      expect(Object.keys(lines).sort()).toEqual(
        [
          'backLabel',
          'confirmSubtitle',
          'confirmTitle',
          'done',
          'doneBody',
          'doneTitle',
          'enterSubtitle',
          'enterTitle',
          'explainerHeading',
          'mismatch',
          'pointAndroid',
          'start',
          'title',
        ].sort(),
      );
      expectEveryValueToBeText(lines);
      expect(points.length).toBeGreaterThan(0);
      points.forEach((line) => expect(line.trim()).not.toBe(''));
    });

    it('should give the lock settings screen every line as non-empty text', () => {
      expect(Object.keys(copy.lockSettings).sort()).toEqual(
        [
          'changePin',
          'changed',
          'currentForChange',
          'currentForOff',
          'currentTitle',
          'newTitle',
          'off',
          'statusCaption',
          'statusOn',
          'title',
          'turnOff',
          'turnOffCaption',
        ].sort(),
      );
      expectEveryValueToBeText(copy.lockSettings);
    });

    it('should give the wrong PIN and the wait their lines', () => {
      expect(Object.keys(copy.lock).sort()).toEqual([
        'promptMessage',
        'saveFailed',
        'wait',
        'wrong',
      ]);
      expect(fillCopy(copy.lock.wait, { time: '0:24' })).toBe('Too many tries. Try again in 0:24.');
      expectEveryValueToBeText(copy.lock);
    });

    it('should name every kind of biometrics with its own set of lines', () => {
      expect(Object.keys(copy.biometrics.kinds).sort()).toEqual([...biometricsKinds].sort());
      biometricsKinds.forEach((kind) => {
        expect(Object.keys(copy.biometrics.kinds[kind]).sort()).toEqual(
          [
            'body',
            'doneBody',
            'rowValue',
            'title',
            'toggleCaption',
            'toggleLabel',
            'tryAgain',
            'unavailable',
            'yes',
          ].sort(),
        );
        expectEveryValueToBeText(copy.biometrics.kinds[kind]);
      });
    });

    it('should give the biometrics offer its shared lines', () => {
      expect(Object.keys(copy.biometrics).sort()).toEqual(
        ['checkReason', 'failed', 'kinds', 'notNow', 'toggleFailed'].sort(),
      );
    });

    it('should keep every app lock line free of dashes and semicolons', () => {
      const { points, ...setupLines } = copy.lockSetup;
      const { kinds, ...biometricsLines } = copy.biometrics;
      const lines = [
        ...points,
        ...Object.values(setupLines),
        ...Object.values(copy.lockSettings),
        ...Object.values(copy.lock),
        ...Object.values(copy.pin),
        ...Object.values(biometricsLines),
        ...Object.values(kinds).flatMap((kind) => Object.values(kind)),
        copy.settings.lockLabel,
        copy.settings.lockOff,
        copy.settings.lockOnPin,
      ];
      lines.forEach((line) => expect(hasDashOrSemicolon(line)).toBe(false));
    });

    it('should not name a drink or use a gendered word in any app lock line', () => {
      const lines = [
        ...copy.lockSetup.points,
        copy.lockSetup.explainerHeading,
        ...Object.values(copy.lockSettings),
      ];
      lines.forEach((line) => expect(hasBarredWord(line)).toBe(false));
    });
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

  it('should give the Drink If summary every line as non-empty text, free of dashes and semicolons', () => {
    expect(Object.keys(copy.questionsSummary).sort()).toEqual(
      [
        'badge',
        'discoveriesBody',
        'discoveriesMany',
        'discoveriesOne',
        'guessCount',
        'guessedRight',
        'guessesLine',
        'home',
        'knowsBestLine',
        'matchesLineMany',
        'matchesLineOne',
        'noGuessLine',
        'playAgain',
        'playerSummary',
        'playerSummaryBest',
        'playerSummaryNoGuesses',
        'questionCountMany',
        'questionCountOne',
        'saveFailed',
        'settings',
        'subtitle',
        'tieLine',
        'title',
      ].sort(),
    );
    expectEveryValueToBeText(copy.questionsSummary);
    Object.values(copy.questionsSummary).forEach((line) =>
      expect(hasDashOrSemicolon(line)).toBe(false),
    );
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
