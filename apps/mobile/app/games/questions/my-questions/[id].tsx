import { useLocalSearchParams } from 'expo-router';

import { QuestionEditorScreen } from '../../../../features/ownQuestions/QuestionEditorScreen';

export default function EditQuestionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Keyed by the id, so opening another question starts the form again from that question.
  return <QuestionEditorScreen key={id} questionId={id} />;
}
