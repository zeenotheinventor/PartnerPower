import type { CustomQuestion } from '@getfreak/core';
import { useCallback, useEffect, useState } from 'react';

import type { PersonalRepository, QuestionDraft, QuestionProblem, SaveResult } from '../storage';
import { usePersonalData } from './PersonalDataProvider';

export type CustomQuestions = {
  /** True until the list has been read. */
  isLoading: boolean;
  questions: CustomQuestion[];
  /** Saves a new question, or changes one when the draft holds its id. A rejected one is not stored. */
  save: (draft: QuestionDraft) => Promise<SaveResult<CustomQuestion, QuestionProblem>>;
  /** Also deletes the discoveries about the question. */
  remove: (id: string) => Promise<void>;
};

// Nothing here logs. Question text and options are personal.
/** The player's own questions for the screens, over the personal store. */
export function useCustomQuestions(): CustomQuestions {
  const { repository, isLoading: isStoreLoading } = usePersonalData();
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  // What the list was last read from, so a new repository after a reload counts as not read yet.
  const [readFrom, setReadFrom] = useState<PersonalRepository | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    repository.listPlayerQuestions().then(
      (listed) => {
        if (isCurrent) {
          setQuestions(listed);
          setReadFrom(repository);
        }
      },
      () => {
        if (isCurrent) setReadFrom(repository);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [repository]);

  const refresh = useCallback(async () => {
    setQuestions(await repository.listPlayerQuestions());
  }, [repository]);

  const save = useCallback(
    async (draft: QuestionDraft) => {
      const result = await repository.savePlayerQuestion(draft);
      if (result.ok) await refresh();
      return result;
    },
    [repository, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await repository.deletePlayerQuestion(id);
      await refresh();
    },
    [repository, refresh],
  );

  return { isLoading: isStoreLoading || readFrom !== repository, questions, save, remove };
}
