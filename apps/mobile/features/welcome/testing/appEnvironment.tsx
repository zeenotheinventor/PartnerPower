import { act, renderRouter } from 'expo-router/testing-library';
import backend from 'expo-sqlite/kv-store';

import { createNativeFeedbackDevice } from '../../../feedback/nativeFeedbackDevice';

// Importing this file first sets up what the real route tree needs under Jest. The real storage
// module runs over an in-memory backend, so the native module is not needed and a "second launch"
// is a fresh render over the same stored data.
jest.mock('expo-sqlite/kv-store', () => {
  const { createInMemoryBackend } = jest.requireActual<
    typeof import('../../../storage/createInMemoryBackend')
  >('../../../storage/createInMemoryBackend');
  return { __esModule: true, default: createInMemoryBackend() };
});

// The encrypted database, its key and its native modules are not available under Jest. The root
// layout loads the personal store at launch, so a route test gets an empty in-memory one instead.
jest.mock('../../../storage/personal/nativePersonalStore', () => {
  const { createInMemoryPersonalRepository } = jest.requireActual<
    typeof import('../../../storage/personal/createInMemoryPersonalRepository')
  >('../../../storage/personal/createInMemoryPersonalRepository');
  const createEmpty = () =>
    createInMemoryPersonalRepository({
      getShippedCards: () => [],
      getShippedQuestions: () => [],
      randomUUID: () => '00000000-0000-4000-8000-000000000001',
      now: () => 1,
    });
  return {
    __esModule: true,
    personalStore: { load: () => Promise.resolve(createEmpty()), clear: () => Promise.resolve() },
    personalDataSource: { load: () => Promise.resolve(createEmpty()), createEmpty },
  };
});

// Jest does not run Expo's config plugins, so the router options the plugin would put in the
// config are taken from app.json the same way: the plugin's options become `extra.router`.
jest.mock('expo-constants', () => {
  const actual = jest.requireActual<typeof import('expo-constants')>('expo-constants');
  const appConfig = jest.requireActual<{ expo: { plugins: unknown[] } }>('../../../app.json');
  const routerPlugin = appConfig.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-router',
  );
  const routerOptions = Array.isArray(routerPlugin) ? routerPlugin[1] : {};
  return {
    __esModule: true,
    default: { ...actual.default, expoConfig: { extra: { router: routerOptions } } },
  };
});

// The style sheet is compiled by Metro, which Jest does not run.
jest.mock('../../../global.css', () => ({}));

// The phone's sounds and haptics are replaced by one recording device, so a route test can check
// what a press asked for. A test clears it before it starts.
jest.mock('../../../feedback/nativeFeedbackDevice', () => {
  const device = { playSound: jest.fn(), triggerHaptic: jest.fn(), cancelHaptics: jest.fn() };
  return { createNativeFeedbackDevice: () => device };
});

export { backend };

export const feedbackDevice = createNativeFeedbackDevice();

type RouterContext = Parameters<typeof renderRouter>[0];

let currentView: ReturnType<typeof renderRouter> | undefined;

// Expo Router's own matcher for this has no TypeScript declaration, so the path is read directly.
export function currentPathname() {
  return currentView?.getPathname();
}

/** Renders the app at the given URL and waits for the settings and the fonts to be ready. */
export async function launchApp(initialUrl: string, context: RouterContext = './app') {
  const view = renderRouter(context, { initialUrl });
  currentView = view;
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
  return view;
}
