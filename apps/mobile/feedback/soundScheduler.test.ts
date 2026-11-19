import { soundMilliseconds } from './soundMilliseconds';
import { createSoundScheduler } from './soundScheduler';
import type { FeedbackMoment } from './types';

function createScheduler(soundOn = true) {
  const fired: FeedbackMoment[] = [];
  const scheduler = createSoundScheduler((moment) => fired.push(moment), soundOn);
  return { scheduler, fired };
}

describe('createSoundScheduler', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  describe('a press', () => {
    it('should fire at once', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.press('tap');

      expect(fired).toEqual(['tap']);
    });

    it('should fire every time in a rapid run, so each one restarts the sound', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.press('tap');
      jest.advanceTimersByTime(10);
      scheduler.press('tap');
      scheduler.press('tap');

      expect(fired).toEqual(['tap', 'tap', 'tap']);
    });
  });

  describe('a game moment', () => {
    it('should fire at once when nothing is playing', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.moment('deal');

      expect(fired).toEqual(['deal']);
    });

    it('should wait until the press sound has finished', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.press('done');
      scheduler.moment('deal');
      jest.advanceTimersByTime(soundMilliseconds.done - 1);
      expect(fired).toEqual(['done']);

      jest.advanceTimersByTime(1);
      expect(fired).toEqual(['done', 'deal']);
    });

    it('should fire at once when the press sound has already finished', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.press('tap');
      jest.advanceTimersByTime(soundMilliseconds.tap);
      scheduler.moment('deal');

      expect(fired).toEqual(['tap', 'deal']);
    });

    it('should be skipped when a press lands before it has had its turn', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.press('done');
      scheduler.moment('deal');
      jest.advanceTimersByTime(100);
      scheduler.press('pass');
      jest.advanceTimersByTime(2000);

      expect(fired).toEqual(['done', 'pass']);
    });

    it('should wait for another game moment that is still playing', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.moment('stepUp');
      scheduler.moment('deal');
      expect(fired).toEqual(['stepUp']);

      jest.advanceTimersByTime(soundMilliseconds.stepUp);
      expect(fired).toEqual(['stepUp', 'deal']);
    });

    it('should leave only the latest of several waiting moments', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.press('done');
      scheduler.moment('handover');
      scheduler.moment('deal');
      jest.advanceTimersByTime(2000);

      expect(fired).toEqual(['done', 'deal']);
    });

    it('should not be waited on by a press, which fires over a moment that is playing', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.moment('roundComplete');
      scheduler.press('tap');

      expect(fired).toEqual(['roundComplete', 'tap']);
    });

    it('should keep later moments waiting for the longer of two sounds', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.moment('roundComplete');
      jest.advanceTimersByTime(10);
      scheduler.press('tap');
      scheduler.moment('sheetOpen');
      jest.advanceTimersByTime(soundMilliseconds.roundComplete - 11);
      expect(fired).toEqual(['roundComplete', 'tap']);

      jest.advanceTimersByTime(1);
      expect(fired).toEqual(['roundComplete', 'tap', 'sheetOpen']);
    });
  });

  describe('with sound off', () => {
    it('should fire a game moment at once after a press, since no sound is playing', () => {
      const { scheduler, fired } = createScheduler(false);

      scheduler.press('done');
      scheduler.moment('deal');

      expect(fired).toEqual(['done', 'deal']);
    });

    it('should not make a game moment wait for another game moment', () => {
      const { scheduler, fired } = createScheduler(false);

      scheduler.moment('stepUp');
      scheduler.moment('deal');

      expect(fired).toEqual(['stepUp', 'deal']);
    });
  });

  describe('an alarm', () => {
    it('should fire at once while a press sound is playing', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.press('done');
      scheduler.alarm('timerEnd');

      expect(fired).toEqual(['done', 'timerEnd']);
    });

    it('should not be cancelled by a press right after it', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.alarm('timerEnd');
      scheduler.press('locked');
      jest.advanceTimersByTime(2000);

      expect(fired).toEqual(['timerEnd', 'locked']);
    });

    it('should not drop a game moment that is waiting', () => {
      const { scheduler, fired } = createScheduler();
      scheduler.press('done');
      scheduler.moment('deal');

      scheduler.alarm('timerEnd');
      expect(fired).toEqual(['done', 'timerEnd']);
      jest.advanceTimersByTime(2000);

      expect(fired).toEqual(['done', 'timerEnd', 'deal']);
    });

    it('should make a game moment wait for its sound to end', () => {
      const { scheduler, fired } = createScheduler();

      scheduler.alarm('timerEnd');
      scheduler.moment('deal');
      expect(fired).toEqual(['timerEnd']);

      jest.advanceTimersByTime(soundMilliseconds.timerEnd);
      expect(fired).toEqual(['timerEnd', 'deal']);
    });
  });

  describe('cancel', () => {
    it('should drop a moment that is waiting', () => {
      const { scheduler, fired } = createScheduler();
      scheduler.press('done');
      scheduler.moment('deal');

      scheduler.cancel();
      jest.advanceTimersByTime(2000);

      expect(fired).toEqual(['done']);
    });
  });
});

describe('soundMilliseconds', () => {
  it('should keep every press sound under 120 ms, except the long done and pass sounds', () => {
    const quickPresses = ['tap', 'toggleOn', 'toggleOff', 'select', 'back', 'locked'] as const;

    quickPresses.forEach((press) => expect(soundMilliseconds[press]).toBeLessThan(120));
  });

  it('should keep the round complete jingle under 1.2 seconds', () => {
    expect(soundMilliseconds.roundComplete).toBeLessThan(1200);
  });
});
