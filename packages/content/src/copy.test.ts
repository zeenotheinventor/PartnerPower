import { copy } from './copy';

function expectEveryValueToBeText(group: Record<string, string>) {
  Object.values(group).forEach((value) => expect(value.trim()).not.toBe(''));
}

describe('copy', () => {
  it('should name the app', () => {
    expect(copy.appName).toBe('Get Freak');
  });

  it('should give the hub every line as non-empty text', () => {
    expect(Object.keys(copy.hub).sort()).toEqual(['comingSoon', 'greeting'].sort());
    expectEveryValueToBeText(copy.hub);
  });

  it('should give the round setup screen every line as non-empty text', () => {
    expect(Object.keys(copy.roundSetup).sort()).toEqual(['backLabel', 'status'].sort());
    expectEveryValueToBeText(copy.roundSetup);
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
});
