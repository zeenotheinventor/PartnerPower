import type { ColorTheme, TypeStyle } from '@getfreak/tokens';

type ColorTree = { [name: string]: string | ColorTree };

function toDashCase(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function mapColorTree(
  tree: ColorTree,
  mapLeaf: (path: string[]) => string,
  parentPath: string[] = [],
): ColorTree {
  return Object.fromEntries(
    Object.entries(tree).map(([name, child]) => {
      const path = [...parentPath, toDashCase(name)];
      return [
        toDashCase(name),
        typeof child === 'string' ? mapLeaf(path) : mapColorTree(child, mapLeaf, path),
      ];
    }),
  );
}

function leafEntries(tree: ColorTree, parentPath: string[] = []): [string, string][] {
  return Object.entries(tree).flatMap(([name, child]) => {
    const path = [...parentPath, toDashCase(name)];
    return typeof child === 'string' ? [[path.join('-'), child]] : leafEntries(child, path);
  });
}

function variableName(path: string[]): string {
  return `--color-${path.join('-')}`;
}

function toPixels(points: number): string {
  return `${points}px`;
}

/** The CSS variables that carry one theme's colours. */
export function colorVariables(theme: ColorTheme): Record<string, string> {
  return Object.fromEntries(leafEntries(theme).map(([name, value]) => [`--color-${name}`, value]));
}

/** Tailwind colour names that read the variables, so one class follows the colour scheme. */
export function colorUtilities(theme: ColorTheme): ColorTree {
  return mapColorTree(theme, (path) => `var(${variableName(path)})`);
}

/** Spacing keyed by the size in points, so p-16 is 16px. */
export function spacingUtilities(scale: readonly number[]): Record<number, string> {
  return Object.fromEntries(scale.map((points) => [points, toPixels(points)]));
}

export function radiusUtilities(scale: Record<string, number>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(scale).map(([name, points]) => [name, toPixels(points)]),
  );
}

/** One class per type style, such as type-body-bold, setting family, size and line height. */
export function typeStyleUtilities(
  scale: Record<string, TypeStyle>,
): Record<string, Record<string, string>> {
  return Object.fromEntries(
    Object.entries(scale).map(([name, style]) => [
      `.type-${toDashCase(name)}`,
      {
        fontFamily: style.fontFamily,
        fontSize: toPixels(style.fontSize),
        lineHeight: toPixels(style.lineHeight),
      },
    ]),
  );
}
