// This import comes first so that its mocks are in place before Expo Router loads.
import { currentPathname, launchApp } from './testing/appEnvironment';

import { readdirSync } from 'node:fs';
import path from 'node:path';

import { screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

const appDirectory = path.resolve(__dirname, '../../app');
const routeExtensions = ['.tsx', '.ts', '.jsx', '.js'];
const routeFileFilter = (fileName: string) => routeExtensions.includes(path.extname(fileName));

// Files that are not a route a player can open: layouts, the welcome route itself, and anything
// Expo Router treats as special, which is named with a leading underscore or plus sign.
function isRouteFile(relativePath: string) {
  const baseName = path.basename(relativePath);
  const isSpecial = baseName.startsWith('_') || baseName.startsWith('+');
  return !isSpecial && relativePath !== 'welcome.tsx' && !relativePath.includes('.test.');
}

function listRouteFiles(directory = ''): string[] {
  return readdirSync(path.join(appDirectory, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const relativePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listRouteFiles(relativePath);
      return routeFileFilter(entry.name) && isRouteFile(relativePath) ? [relativePath] : [];
    },
  );
}

// Dynamic segments get a sample value and groups are not part of the URL.
function urlForRouteFile(relativePath: string) {
  const segments = relativePath
    .slice(0, -path.extname(relativePath).length)
    .split(path.sep)
    .filter((segment) => !/^\(.*\)$/.test(segment))
    .map((segment) => segment.replace(/^\[.*\]$/, 'sample'));
  if (segments.at(-1) === 'index') segments.pop();
  return `/${segments.join('/')}`;
}

const routeFiles = listRouteFiles();

const mockRenderedRoutes: string[] = [];

// Every route file is replaced by a stand-in that records that it rendered. The layouts, the
// welcome route and the not-found route are the real ones.
function createOverrides() {
  return Object.fromEntries(
    routeFiles.map((relativePath) => {
      const key = relativePath
        .slice(0, -path.extname(relativePath).length)
        .split(path.sep)
        .join('/');
      const StandIn = () => {
        mockRenderedRoutes.push(relativePath);
        return <Text>{relativePath}</Text>;
      };
      return [key, StandIn];
    }),
  );
}

describe('every route file in the app', () => {
  it('should find at least one route file, so the test below is not empty', () => {
    expect(routeFiles).not.toHaveLength(0);
  });

  it.each(routeFiles.map((relativePath) => [relativePath, urlForRouteFile(relativePath)]))(
    'should be closed to a player who has not confirmed: %s opened at %s',
    async (relativePath, url) => {
      mockRenderedRoutes.length = 0;

      await launchApp(url, { appDir: './app', overrides: createOverrides() });

      expect(currentPathname()).toBe('/welcome');
      expect(mockRenderedRoutes).toEqual([]);
      expect(screen.queryByText(relativePath)).not.toBeOnTheScreen();
    },
  );
});
