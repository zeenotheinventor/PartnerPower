import type { CategoryId } from '@getfreak/core';

export type CategoryMarkersProps = {
  /** The category the round has reached. The markers up to and including it are filled. */
  category: CategoryId;
};
