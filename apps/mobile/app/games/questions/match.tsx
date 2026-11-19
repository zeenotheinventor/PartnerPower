import { SecretMatchProvider } from '../../../features/secretMatch/SecretMatchProvider';
import { SecretMatchScreen } from '../../../features/secretMatch/SecretMatchScreen';

// The session lives here, in memory only, so leaving the route by any path discards it.
export default function SecretMatchRoute() {
  return (
    <SecretMatchProvider>
      <SecretMatchScreen />
    </SecretMatchProvider>
  );
}
