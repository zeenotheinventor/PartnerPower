import { copy } from './copy';

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
        'playerOneLabel',
        'playerTwoLabel',
        'start',
        'surprises',
        'title',
      ].sort(),
    );
    expectEveryValueToBeText(copy.roundSetup);
  });

  it('should give the round screen every line as non-empty text', () => {
    expect(Object.keys(copy.roundPlay).sort()).toEqual(
      [
        'backLabel',
        'bothOfYou',
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
    expectEveryValueToBeText(copy.roundPlay);
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
        'home',
        'playAgain',
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
