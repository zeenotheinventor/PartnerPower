import type { screen } from 'nativewind/test';

type Element = ReturnType<typeof screen.getByRole>;

/**
 * The plain views inside an element, in tree order. A decorative view such as a track, a knob or
 * a depth edge has no role or label to query by, so a test reads it from the tree through its
 * parent, which does have a role.
 */
export function hostViewsInside(element: Element): Element[] {
  return element.findAll((node) => node !== element && String(node.type) === 'View');
}

/** One of the plain views inside an element. It throws when the element has too few of them. */
export function hostViewInside(element: Element, index: number): Element {
  const view = hostViewsInside(element)[index];
  if (view === undefined) throw new Error(`The element has no plain view at index ${index}`);
  return view;
}
