import { Stack } from 'expo-router';

import { QuestionRoundProvider } from '../../../features/questionRound/QuestionRoundProvider';

// The round lives here, so setup and play share it and leaving the route group discards it.
export default function QuestionsLayout() {
  return (
    <QuestionRoundProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </QuestionRoundProvider>
  );
}
