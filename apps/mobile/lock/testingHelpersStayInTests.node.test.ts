import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(__dirname, '..');
const skippedFolders = ['node_modules', '.expo', 'dist', 'coverage', 'ios', 'android'];
const helperFolder = 'lock/testing/';
const routeTestHelperFolder = 'features/welcome/testing/';

function sourceFilesIn(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory())
      return skippedFolders.includes(entry.name) ? [] : sourceFilesIn(fullPath);
    return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

// An import or require whose path reaches into the lock's test helpers, from anywhere.
function importsLockTestHelpers(source: string): boolean {
  return /(?:from|require\(|import\()\s*'[^']*\block\/testing\/[^']*'/.test(source);
}

// The helpers hold fakes, `jest` calls and a hash that is not the real one. A file that ships must
// never reach them, or they would end up in the app. Tests, and the helpers themselves, may. So may
// the folder that launches the app for route tests. A bundle of the release build holds none of
// them.
function mayUseHelpers(relativePath: string): boolean {
  return (
    /\.test\.tsx?$/.test(relativePath) ||
    relativePath.startsWith(helperFolder) ||
    relativePath.startsWith(routeTestHelperFolder)
  );
}

describe('the lock test helpers', () => {
  const files = sourceFilesIn(appRoot).map((file) => ({
    relativePath: path.relative(appRoot, file).split(path.sep).join('/'),
    source: readFileSync(file, 'utf8'),
  }));

  it('should scan the lock service and a screen', () => {
    const paths = files.map(({ relativePath }) => relativePath);

    expect(paths).toContain('lock/createLockService.ts');
    expect(paths).toContain('features/lockSetup/LockOnSettings/LockOnSettings.tsx');
    expect(paths).toContain('lock/testing/createTestLock.ts');
  });

  it('should be imported only by tests', () => {
    const offenders = files
      .filter(({ relativePath }) => !mayUseHelpers(relativePath))
      .filter(({ source }) => importsLockTestHelpers(source))
      .map(({ relativePath }) => relativePath);

    expect(offenders).toEqual([]);
  });

  it('should be imported by at least one test, so the scan is looking at real imports', () => {
    const importers = files.filter(({ source }) => importsLockTestHelpers(source));

    expect(importers.length).toBeGreaterThan(0);
  });

  it.each([
    ["import { createTestLock } from '../../../lock/testing/createTestLock';"],
    ["import { sha256Hex } from '../lock/testing/sha256Hex';"],
    ["const { sha256Hex } = require('../../lock/testing/sha256Hex');"],
  ])('should find a helper import in: %s', (source) => {
    expect(importsLockTestHelpers(source)).toBe(true);
  });

  it('should find nothing in an ordinary import', () => {
    expect(importsLockTestHelpers("import { lockService } from '../../lock';")).toBe(false);
  });
});
