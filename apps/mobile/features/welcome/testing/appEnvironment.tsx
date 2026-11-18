import { act, renderRouter } from 'expo-router/testing-library';
import backend from 'expo-sqlite/kv-store';

// Importing this file first sets up what the real route tree needs under Jest. The real storage
// module runs over an in-memory backend, so the native module is not needed and a "second launch"
// is a fresh render over the same stored data.
jest.mock('expo-sqlite/kv-store', () => {
  const { createInMemoryBackend } = jest.requireActual<
    typeof import('../../../storage/createInMemoryBackend')
  >('../../../storage/createInMemoryBackend');
  return { __esModule: true, default: createInMemoryBackend() };
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

export { backend };

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
