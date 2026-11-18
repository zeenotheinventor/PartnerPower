import { colorScheme, render } from 'nativewind/test';
import type { ReactElement } from 'react';

import config from '../tailwind.config';

type ThemeName = 'light' | 'dark';

// NativeWind's test render only compiles classes it can see on the element it is given, so this
// safelist compiles every utility with one of these prefixes. A utility prefix missing from the
// list will silently not resolve, so add the prefix here when a test needs it.
const safelistedPrefixes =
  /^(flex|items|justify|bg|border|p|mt|gap|h|w|rounded|text|font|type|opacity|px|py|pb|pt|mb|translate|self|grow|inset|top|bottom|min|ml|rotate)-/;

/** Renders with the app's real Tailwind config while the device is in the given colour scheme. */
export async function renderThemed(element: ReactElement, themeName: ThemeName = 'light') {
  colorScheme.set(themeName);
  return render(element, {
    config: {
      ...config,
      safelist: [
        // Utilities without a dash in their name are listed by name.
        'absolute',
        'uppercase',
        'grow',
        { pattern: safelistedPrefixes },
        { pattern: safelistedPrefixes, variants: ['group-active', 'placeholder'] },
      ],
    },
  });
}
