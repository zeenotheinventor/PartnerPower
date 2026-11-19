import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(__dirname, '..');
const skippedFolders = ['node_modules', '.expo', 'dist', 'coverage', 'ios', 'android'];
const helperFolder = 'reminder/testing/';

function sourceFilesIn(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory())
      return skippedFolders.includes(entry.name) ? [] : sourceFilesIn(fullPath);
    return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

// An import or require whose path reaches into the reminder's test helpers, from anywhere.
function importsReminderTestHelpers(source: string): boolean {
  return /(?:from|require\(|import\()\s*'[^']*\breminder\/testing\/[^']*'/.test(source);
}

// The helpers hold fakes. A file that ships must never reach them, or they would end up in the
// app. Tests, and the helpers themselves, may.
function mayUseHelpers(relativePath: string): boolean {
  return /\.test\.tsx?$/.test(relativePath) || relativePath.startsWith(helperFolder);
}

describe('the reminder test helpers', () => {
  const files = sourceFilesIn(appRoot).map((file) => ({
    relativePath: path.relative(appRoot, file).split(path.sep).join('/'),
    source: readFileSync(file, 'utf8'),
  }));

  it('should scan the reminder service and a helper', () => {
    const paths = files.map(({ relativePath }) => relativePath);

    expect(paths).toContain('reminder/createReminderService.ts');
    expect(paths).toContain('reminder/testing/createTestReminder.ts');
  });

  it('should be imported only by tests', () => {
    const offenders = files
      .filter(({ relativePath }) => !mayUseHelpers(relativePath))
      .filter(({ source }) => importsReminderTestHelpers(source))
      .map(({ relativePath }) => relativePath);

    expect(offenders).toEqual([]);
  });

  it('should be imported by at least one test, so the scan is looking at real imports', () => {
    const importers = files.filter(({ source }) => importsReminderTestHelpers(source));

    expect(importers.length).toBeGreaterThan(0);
  });

  it.each([
    ["import { createTestReminder } from '../../../reminder/testing/createTestReminder';"],
    ["const { createTestReminder } = require('../reminder/testing/createTestReminder');"],
  ])('should find a helper import in: %s', (source) => {
    expect(importsReminderTestHelpers(source)).toBe(true);
  });

  it('should find nothing in an ordinary import', () => {
    expect(importsReminderTestHelpers("import { reminderService } from '../../reminder';")).toBe(
      false,
    );
  });
});
