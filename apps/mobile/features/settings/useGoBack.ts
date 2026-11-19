import { useRouter } from 'expo-router';

/**
 * Gives the function behind a back button. A deep link can open a screen with nothing behind it,
 * so it then goes to the given route instead.
 */
export function useGoBack(fallbackRoute: string): () => void {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace(fallbackRoute));
}
