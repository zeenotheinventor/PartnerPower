import { useLocalSearchParams } from 'expo-router';

import { DareEditorScreen } from '../../../../features/ownCards/DareEditorScreen';

export default function EditDareRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Keyed by the id, so opening another dare starts the form again from that dare.
  return <DareEditorScreen key={id} dareId={id} />;
}
