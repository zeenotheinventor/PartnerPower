import { Platform, Vibration } from 'react-native';

import { isVibrationSupported, startVibration, stopVibration } from './vibration';

// The setup file replaces the module for every other test, so this one takes the real one.
const real = jest.requireActual<typeof import('./vibration')>('./vibration');

function onPlatform(os: 'ios' | 'android' | 'web', isPad = false) {
  // Jest runs as an iPhone, which is when `isPad` exists. Only the iOS branch of the code reads it.
  if (Platform.OS === 'ios') jest.spyOn(Platform, 'isPad', 'get').mockReturnValue(isPad);
  jest.replaceProperty(Platform, 'OS', os);
}

describe('vibration', () => {
  let vibrate: jest.SpyInstance;
  let cancel: jest.SpyInstance;

  beforeEach(() => {
    vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    cancel = jest.spyOn(Vibration, 'cancel').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('isVibrationSupported', () => {
    it('should be supported on Android', () => {
      onPlatform('android');

      expect(real.isVibrationSupported()).toBe(true);
    });

    it('should be supported on an iPhone', () => {
      onPlatform('ios');

      expect(real.isVibrationSupported()).toBe(true);
    });

    it('should not be supported on an iPad', () => {
      onPlatform('ios', true);

      expect(real.isVibrationSupported()).toBe(false);
    });

    it('should not be supported on the web', () => {
      onPlatform('web');

      expect(real.isVibrationSupported()).toBe(false);
    });
  });

  describe('startVibration', () => {
    it('should vibrate once for the whole time on Android', () => {
      onPlatform('android');

      real.startVibration(10);

      expect(vibrate).toHaveBeenCalledTimes(1);
      expect(vibrate).toHaveBeenCalledWith(10000);
    });

    it('should buzz every 400 milliseconds for the whole time on an iPhone', () => {
      onPlatform('ios');

      real.startVibration(10);

      // The first buzz at once, then a pause before each of the next 24: 25 buzzes of about 400 ms.
      expect(vibrate).toHaveBeenCalledTimes(1);
      expect(vibrate).toHaveBeenCalledWith([0, ...Array<number>(24).fill(400)]);
    });

    it('should round the iPhone buzz count up when the time is not a whole number of buzzes', () => {
      onPlatform('ios');

      real.startVibration(1);

      expect(vibrate).toHaveBeenCalledWith([0, 400, 400]);
    });
  });

  describe('stopVibration', () => {
    it('should cancel the vibration', () => {
      real.stopVibration();

      expect(cancel).toHaveBeenCalledTimes(1);
    });
  });

  it('should be replaced by a phone that cannot vibrate for every other test', () => {
    expect(isVibrationSupported()).toBe(false);
    startVibration(5);
    stopVibration();

    expect(vibrate).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });
});
