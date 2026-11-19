import type { CategoryId } from '@getfreak/core';

// Tailwind only sees whole class names, so each category has its classes written out in full.
export const categoryFillClasses: Record<CategoryId, string> = {
  c1: 'bg-category-c1',
  c2: 'bg-category-c2',
  c3: 'bg-category-c3',
  c4: 'bg-category-c4',
};

export const categoryRingClasses: Record<CategoryId, string> = {
  c1: 'border-category-c1',
  c2: 'border-category-c2',
  c3: 'border-category-c3',
  c4: 'border-category-c4',
};

export const categoryLabelClasses: Record<CategoryId, string> = {
  c1: 'text-on-category-c1',
  c2: 'text-on-category-c2',
  c3: 'text-on-category-c3',
  c4: 'text-on-category-c4',
};
