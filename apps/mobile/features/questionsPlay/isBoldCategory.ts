import { categoryIds, type CategoryId } from '@getfreak/core';

// The last two categories are the bold ones. Theo is flustered in them.
const boldCategories: readonly CategoryId[] = categoryIds.slice(2);

export function isBoldCategory(category: CategoryId): boolean {
  return boldCategories.includes(category);
}
