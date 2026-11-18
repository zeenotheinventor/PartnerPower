import { useRouter } from 'expo-router';

import { Button } from '../../../components/ui';

// This link exists only to reach the kit gallery in development. Nothing here ships to players,
// so the label is a literal and not copy from the content package.
export function DevKitLink() {
  const router = useRouter();

  return (
    <Button label="Open the UI kit" variant="secondary" onPress={() => router.push('/dev/kit')} />
  );
}
