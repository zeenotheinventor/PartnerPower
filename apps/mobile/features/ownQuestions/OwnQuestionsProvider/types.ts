import type { CustomQuestions } from '../../../personal';

export type OwnQuestions = CustomQuestions & {
  /** True when no more questions can be added. */
  hasReachedLimit: boolean;
};
