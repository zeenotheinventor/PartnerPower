import { createInMemoryBackend } from '../storage/createInMemoryBackend';
import { createStorage } from '../storage/createStorage';
import type { Storage } from '../storage';
import { announceUpdateOnce } from './announceUpdateOnce';
import type { LaunchedUpdate, UpdatesDevice } from './types';

const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;

function deviceLaunching(launchedUpdate: LaunchedUpdate | undefined): UpdatesDevice {
  return { getLaunchedUpdate: () => launchedUpdate };
}

const afterAnUpdate = (updateId: string) => deviceLaunching({ isEmbeddedLaunch: false, updateId });

describe('announceUpdateOnce', () => {
  const consoleSpies = consoleMethods.map((method) => jest.spyOn(console, method));

  afterEach(() => {
    consoleSpies.forEach((spy) => spy.mockClear());
  });

  afterAll(() => {
    consoleSpies.forEach((spy) => spy.mockRestore());
  });

  function expectNothingLogged() {
    consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  }

  function setUp() {
    const backend = createInMemoryBackend();
    return { backend, storage: createStorage(backend) };
  }

  it('should announce the first launch on an update and remember its id', async () => {
    const { backend, storage } = setUp();

    const shouldAnnounce = await announceUpdateOnce(afterAnUpdate('update-1'), storage);

    expect(shouldAnnounce).toBe(true);
    expect(backend.entries.get('lastShownUpdateId')).toBe('"update-1"');
    expectNothingLogged();
  });

  it('should not announce a launch of the build that was installed', async () => {
    const { backend, storage } = setUp();
    const device = deviceLaunching({ isEmbeddedLaunch: true, updateId: 'embedded-1' });

    const shouldAnnounce = await announceUpdateOnce(device, storage);

    expect(shouldAnnounce).toBe(false);
    expect(backend.entries.size).toBe(0);
  });

  it('should not announce a fresh install, which launches the embedded build with nothing stored', async () => {
    const { backend, storage } = setUp();
    const device = deviceLaunching({ isEmbeddedLaunch: true, updateId: null });

    expect(await announceUpdateOnce(device, storage)).toBe(false);
    expect(backend.entries.size).toBe(0);
  });

  it('should not announce the same update on a second launch', async () => {
    const { storage } = setUp();
    await announceUpdateOnce(afterAnUpdate('update-1'), storage);

    const shouldAnnounce = await announceUpdateOnce(afterAnUpdate('update-1'), storage);

    expect(shouldAnnounce).toBe(false);
  });

  it('should announce a newer update after an earlier one was announced', async () => {
    const { backend, storage } = setUp();
    await announceUpdateOnce(afterAnUpdate('update-1'), storage);

    const shouldAnnounce = await announceUpdateOnce(afterAnUpdate('update-2'), storage);

    expect(shouldAnnounce).toBe(true);
    expect(backend.entries.get('lastShownUpdateId')).toBe('"update-2"');
  });

  it('should not announce when the launch has no update id', async () => {
    const { storage } = setUp();
    const device = deviceLaunching({ isEmbeddedLaunch: false, updateId: null });

    expect(await announceUpdateOnce(device, storage)).toBe(false);
  });

  it('should be silent when updates are not available on the device', async () => {
    const { backend, storage } = setUp();

    const shouldAnnounce = await announceUpdateOnce(deviceLaunching(undefined), storage);

    expect(shouldAnnounce).toBe(false);
    expect(backend.entries.size).toBe(0);
    expectNothingLogged();
  });

  it('should be silent when asking the device throws', async () => {
    const { storage } = setUp();
    const device: UpdatesDevice = {
      getLaunchedUpdate: () => {
        throw new Error('native module missing');
      },
    };

    expect(await announceUpdateOnce(device, storage)).toBe(false);
    expectNothingLogged();
  });

  it('should treat a failing read as not announced before and announce', async () => {
    const failingRead: Storage = {
      ...createStorage(createInMemoryBackend()),
      get: () => Promise.reject(new Error('read failed')),
    };

    expect(await announceUpdateOnce(afterAnUpdate('update-1'), failingRead)).toBe(true);
    expectNothingLogged();
  });

  it('should still announce when remembering the id fails', async () => {
    const failingWrite: Storage = {
      ...createStorage(createInMemoryBackend()),
      set: () => Promise.reject(new Error('write failed')),
    };

    expect(await announceUpdateOnce(afterAnUpdate('update-1'), failingWrite)).toBe(true);
    expectNothingLogged();
  });
});
