import { createFeedback } from './createFeedback';
import type { FeedbackDevice, FeedbackMoment } from './types';

function createFakeDevice() {
  const calls: string[] = [];
  const device: FeedbackDevice = {
    playSound: jest.fn((sound) => calls.push(`sound:${sound}`)),
    triggerHaptic: jest.fn((moment) => calls.push(`haptic:${moment}`)),
    cancelHaptics: jest.fn(),
  };
  return { device, calls };
}

const allOn = { soundOn: true, hapticsOn: true };

const allMoments = [
  'tap',
  'done',
  'pass',
  'toggleOn',
  'toggleOff',
  'select',
  'back',
  'locked',
  'deal',
  'stepUp',
  'handover',
  'sheetOpen',
  'roundComplete',
  'timerEnd',
] as const satisfies readonly FeedbackMoment[];

describe('createFeedback', () => {
  describe.each(allMoments)('the %s moment', (moment) => {
    it('should play its own sound and fire its own haptic, sound first', () => {
      const { device, calls } = createFakeDevice();

      createFeedback(device, allOn)[moment]();

      expect(calls).toEqual([`sound:${moment}`, `haptic:${moment}`]);
    });

    it('should play nothing when sound is off and still fire the haptic', () => {
      const { device } = createFakeDevice();

      createFeedback(device, { soundOn: false, hapticsOn: true })[moment]();

      expect(device.playSound).not.toHaveBeenCalled();
      expect(device.triggerHaptic).toHaveBeenCalledWith(moment);
    });

    it('should fire nothing when haptics are off and still play the sound', () => {
      const { device } = createFakeDevice();

      createFeedback(device, { soundOn: true, hapticsOn: false })[moment]();

      expect(device.triggerHaptic).not.toHaveBeenCalled();
      expect(device.playSound).toHaveBeenCalledWith(moment);
    });
  });

  describe('the scheduling of game moments', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should wait for the press sound to finish before the deal, sound and haptic together', () => {
      const { device, calls } = createFakeDevice();
      const feedback = createFeedback(device, allOn);

      feedback.done();
      feedback.deal();
      expect(calls).toEqual(['sound:done', 'haptic:done']);

      jest.advanceTimersByTime(250);
      expect(calls).toEqual(['sound:done', 'haptic:done', 'sound:deal', 'haptic:deal']);
    });

    it('should skip the deal, sound and haptic, when another press lands first', () => {
      const { device, calls } = createFakeDevice();
      const feedback = createFeedback(device, allOn);

      feedback.done();
      feedback.deal();
      feedback.tap();
      jest.advanceTimersByTime(2000);

      expect(calls).toEqual(['sound:done', 'haptic:done', 'sound:tap', 'haptic:tap']);
    });

    it('should drop a waiting moment when told to', () => {
      const { device } = createFakeDevice();
      const feedback = createFeedback(device, allOn);
      feedback.done();
      feedback.roundComplete();

      feedback.cancelScheduled();
      jest.advanceTimersByTime(2000);

      expect(device.playSound).toHaveBeenCalledTimes(1);
    });

    it('should fire the timer end at once over a playing press sound, sound and haptic', () => {
      const { device, calls } = createFakeDevice();
      const feedback = createFeedback(device, allOn);

      feedback.done();
      feedback.timerEnd();
      feedback.locked();
      jest.advanceTimersByTime(2000);

      expect(calls).toEqual([
        'sound:done',
        'haptic:done',
        'sound:timerEnd',
        'haptic:timerEnd',
        'sound:locked',
        'haptic:locked',
      ]);
    });

    it('should keep a timer end that has fired when scheduled moments are cancelled', () => {
      const { device } = createFakeDevice();
      const feedback = createFeedback(device, allOn);

      feedback.timerEnd();
      feedback.cancelScheduled();

      expect(device.playSound).toHaveBeenCalledWith('timerEnd');
      expect(device.triggerHaptic).toHaveBeenCalledWith('timerEnd');
    });

    it('should still follow the switches for the timer end', () => {
      const soundOff = createFakeDevice().device;
      const hapticsOff = createFakeDevice().device;

      createFeedback(soundOff, { soundOn: false, hapticsOn: true }).timerEnd();
      createFeedback(hapticsOff, { soundOn: true, hapticsOn: false }).timerEnd();

      expect(soundOff.playSound).not.toHaveBeenCalled();
      expect(soundOff.triggerHaptic).toHaveBeenCalledWith('timerEnd');
      expect(hapticsOff.playSound).toHaveBeenCalledWith('timerEnd');
      expect(hapticsOff.triggerHaptic).not.toHaveBeenCalled();
    });

    it('should fire a haptic-only deal at once, not behind a sound nobody hears', () => {
      const { device } = createFakeDevice();
      const feedback = createFeedback(device, { soundOn: false, hapticsOn: true });

      feedback.done();
      feedback.deal();

      expect(device.triggerHaptic).toHaveBeenCalledWith('deal');
    });

    it('should follow the switches when the waiting moment finally fires', () => {
      const { device } = createFakeDevice();
      const feedback = createFeedback(device, { soundOn: true, hapticsOn: false });

      feedback.done();
      feedback.deal();
      jest.advanceTimersByTime(250);

      expect(device.playSound).toHaveBeenCalledWith('deal');
      expect(device.triggerHaptic).not.toHaveBeenCalled();
    });
  });

  it('should ask the device to drop pending haptics', () => {
    const { device } = createFakeDevice();

    createFeedback(device, allOn).cancelHaptics();

    expect(device.cancelHaptics).toHaveBeenCalledTimes(1);
  });

  it('should do nothing at all when both are off', () => {
    const { device } = createFakeDevice();
    const feedback = createFeedback(device, { soundOn: false, hapticsOn: false });

    allMoments.forEach((moment) => feedback[moment]());

    expect(device.playSound).not.toHaveBeenCalled();
    expect(device.triggerHaptic).not.toHaveBeenCalled();
  });

  describe('when the device fails', () => {
    const failing: FeedbackDevice = {
      playSound: () => {
        throw new Error('The sound failed');
      },
      triggerHaptic: () => {
        throw new Error('The haptic failed');
      },
      cancelHaptics: () => {
        throw new Error('The cancel failed');
      },
    };

    it('should not throw', () => {
      const feedback = createFeedback(failing, allOn);

      expect(() => feedback.tap()).not.toThrow();
      expect(() => feedback.roundComplete()).not.toThrow();
      expect(() => feedback.cancelHaptics()).not.toThrow();
    });

    it('should still fire the haptic when the sound fails', () => {
      const { device } = createFakeDevice();
      const soundFails: FeedbackDevice = {
        ...device,
        playSound: () => {
          throw new Error('The sound failed');
        },
      };

      createFeedback(soundFails, allOn).done();

      expect(device.triggerHaptic).toHaveBeenCalledWith('done');
    });

    it('should not log anything', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      createFeedback(failing, allOn).pass();

      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    });
  });
});
