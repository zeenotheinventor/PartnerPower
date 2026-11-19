import { copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { Header, Screen } from '../../../components/ui';
import { useOwnQuestions } from '../OwnQuestionsProvider';
import { QuestionEditorForm } from '../QuestionEditorForm';
import { ownQuestionsRoute } from '../routes';
import type { QuestionEditorScreenProps } from './types';

// Finds the question to change and hands it to the form, which keeps its own copy to edit. The
// question is kept once it has been found, so the form stays up after the question is deleted until
// the screen has gone back. An id that matches no question, once the store has been read, sends the
// player to the list.
export function QuestionEditorScreen({ questionId }: QuestionEditorScreenProps) {
  const router = useRouter();
  const { questions, isLoading } = useOwnQuestions();

  const found =
    questionId === undefined ? undefined : questions.find((stored) => stored.id === questionId);
  const [question, setQuestion] = useState(found);
  if (found && !question) setQuestion(found);

  const isMissing = questionId !== undefined && !isLoading && !found && !question;
  const hasLeft = useRef(false);
  useEffect(() => {
    if (isMissing && !hasLeft.current) {
      hasLeft.current = true;
      router.replace(ownQuestionsRoute);
    }
  }, [isMissing, router]);

  if (questionId !== undefined && !question) {
    // Nothing to edit yet. The title shows, and the form follows once the question has been read.
    return (
      <Screen>
        <Header
          title={copy.ownQuestions.titleEdit}
          backLabel={copy.ownQuestions.backLabel}
          onBack={() => (router.canGoBack() ? router.back() : router.replace(ownQuestionsRoute))}
        />
      </Screen>
    );
  }

  return <QuestionEditorForm question={question} />;
}
