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

describe('createFeedback', () => {
  describe.each(['tap', 'done', 'pass'] as const)('the %s moment', (moment) => {
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

  describe('the roundComplete moment', () => {
    it('should fire its own haptic and play no sound', () => {
      const { device } = createFakeDevice();

      createFeedback(device, allOn).roundComplete();

      expect(device.triggerHaptic).toHaveBeenCalledTimes(1);
      expect(device.triggerHaptic).toHaveBeenCalledWith('roundComplete');
      expect(device.playSound).not.toHaveBeenCalled();
    });

    it('should fire nothing when haptics are off', () => {
      const { device } = createFakeDevice();

      createFeedback(device, { soundOn: true, hapticsOn: false }).roundComplete();

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

    (['tap', 'done', 'pass', 'roundComplete'] satisfies FeedbackMoment[]).forEach((moment) =>
      feedback[moment](),
    );

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
