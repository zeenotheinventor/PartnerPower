import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceDirectory = __dirname;
const thisFileName = 'importGuard.test.ts';

const importSpecifierPattern =
  /(?:\bfrom\s+|\bimport\s+|\brequire\(\s*|\bimport\(\s*)['"]([^'"]+)['"]/g;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) && entry.name !== thisFileName ? [path] : [];
  });
}

function nonRelativeImportsIn(path: string): string[] {
  const source = readFileSync(path, 'utf8');
  return [...source.matchAll(importSpecifierPattern)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined)
    .filter((specifier) => !specifier.startsWith('.'));
}

describe('tokens import rules', () => {
  it('should import nothing but its own files', () => {
    const offences = listSourceFiles(sourceDirectory).flatMap((path) =>
      nonRelativeImportsIn(path).map((specifier) => `${path} imports ${specifier}`),
    );

    expect(offences).toEqual([]);
  });
});
