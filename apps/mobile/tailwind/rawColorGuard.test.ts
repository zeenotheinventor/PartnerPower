import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import rawColorPattern from '../../../tools/rawColorPattern.json';

// ESLint does not read CSS, so this covers the style sheets. Source files are covered by the
// no-restricted-syntax rule in eslint.config.mjs.
const appDirectory = join(__dirname, '..');
const skippedDirectories = new Set(['node_modules', '.expo']);
const rawColor = new RegExp(rawColorPattern.source, rawColorPattern.flags);

function listStyleSheets(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return skippedDirectories.has(entry.name) ? [] : listStyleSheets(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

describe('style sheets', () => {
  it('should hold no raw colour values', () => {
    const offences = listStyleSheets(appDirectory).filter((path) =>
      rawColor.test(readFileSync(path, 'utf8')),
    );

    expect(offences).toEqual([]);
  });

  it('should find the app style sheet, so the check is not empty', () => {
    expect(listStyleSheets(appDirectory).map((path) => path.split('/').at(-1))).toContain(
      'global.css',
    );
  });
});
