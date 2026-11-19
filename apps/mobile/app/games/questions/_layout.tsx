import { Stack } from 'expo-router';

import { OwnQuestionsProvider } from '../../../features/ownQuestions/OwnQuestionsProvider';
import { QuestionRoundProvider } from '../../../features/questionRound/QuestionRoundProvider';

// The round lives here, so setup and play share it and leaving the route group discards it. So do
// the player's own questions, so the home and setup counts follow what the list and the editor save.
export default function QuestionsLayout() {
  return (
    <OwnQuestionsProvider>
      <QuestionRoundProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </QuestionRoundProvider>
    </OwnQuestionsProvider>
  );
}
