import { copy, fillCopy } from '@getfreak/content';

import { useDiscoveries } from '../../../personal';
import { useOwnQuestions } from '../../ownQuestions/OwnQuestionsProvider';
import type { CountOf } from '../homeEntries';

const countLine = (count: number, none: string, some: string) =>
  count === 0 ? none : fillCopy(some, { count });

/**
 * The count line each home entry shows at the end of its row, such as "Nothing yet" or "12 saved".
 * A line is undefined until its source has been read, so a row never says "none" by mistake.
 */
export function useHomeEntryCounts(): Record<CountOf, string | undefined> {
  const discoveries = useDiscoveries();
  const ownQuestions = useOwnQuestions();
  return {
    discoveries: discoveries.isLoading
      ? undefined
      : countLine(
          discoveries.discoveries.length,
          copy.questionsHome.discoveriesNone,
          copy.questionsHome.discoveriesCount,
        ),
    ownQuestions: ownQuestions.isLoading
      ? undefined
      : countLine(
          ownQuestions.questions.length,
          copy.questionsHome.ownNone,
          copy.questionsHome.ownCount,
        ),
  };
}
