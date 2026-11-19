// Makes the app icon, the Android adaptive icon layers, the splash image and the Play store icon.
// The artwork is written here as SVG, with every colour read from the design tokens, and
// rsvg-convert turns it into PNG. Nothing is random, so a run writes the same pixels each time.
// This is a dev-time tool: CI does not run it, and the PNGs are committed.
//
//   node scripts/generateBrandAssets.mjs
//
// It needs rsvg-convert on the path (`brew install librsvg`). It writes four files to
// assets/images (icon, adaptive-foreground, adaptive-monochrome and splash-icon, all 1024 px) and
// the 512 px Play store icon to store/play-icon-512.png. The store icon is for the owner to upload
// by hand and is not part of the app bundle.

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The tokens are TypeScript source with no build step, and Node runs a .ts file directly, so the
// colours file is loaded by the path the package entry point resolves to.
const tokensEntry = import.meta.resolve('@getfreak/tokens');
const { colorThemes } = await import(new URL('./colors.ts', tokensEntry).href);

const { light, dark } = colorThemes;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const imagesDirectory = path.resolve(scriptDirectory, '../assets/images');
const storeDirectory = path.resolve(scriptDirectory, '../store');

const cardBack = { fill: dark.accent, edge: dark.accentDeep };
const cardFront = { fill: light.accent, edge: light.accentDeep };
const heartColor = light.onAccent;
const sparkleColor = dark.accent;

const heartPath =
  'M600 610 C 520 555 488 515 488 470 C 488 432 516 406 550 406 C 573 406 590 418 600 436 C 610 418 627 406 650 406 C 684 406 712 432 712 470 C 712 515 680 555 600 610 Z';
const sparklePath = 'M790 196 L812 252 L868 274 L812 296 L790 352 L768 296 L712 274 L768 252 Z';
const backCardRotation = 'rotate(-13 430 540)';
const frontCardRotation = 'rotate(11 600 520)';
const backCard = (y) => `<rect x="250" y="${y}" width="360" height="500" rx="64"`;
const frontCard = (y) => `<rect x="420" y="${y}" width="360" height="500" rx="64"`;

const svgOpen =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">';

// Centres the 1024 px mark on the canvas at the given scale. The mark's own centre is (529, 498).
const placed = (scale, content, offsetY = 0) =>
  `<g transform="translate(512 ${512 + offsetY}) scale(${scale}) translate(-529 -498)">${content}</g>`;

const mark = `
  <g transform="${backCardRotation}">
    ${backCard(290)} fill="${cardBack.edge}"/>
    ${backCard(270)} fill="${cardBack.fill}"/>
  </g>
  <g transform="${frontCardRotation}">
    ${frontCard(282)} fill="${cardFront.edge}"/>
    ${frontCard(262)} fill="${cardFront.fill}"/>
    <path d="${heartPath}" fill="${heartColor}"/>
  </g>
  <path d="${sparklePath}" fill="${sparkleColor}"/>`;

// The Android monochrome layer is a single colour that the system tints. The heart and a gap round
// the front card are cut out, so the two cards and the heart still read apart.
const monochromeMark = `
  <defs>
    <mask id="gap" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000">
      <rect x="-2000" y="-2000" width="5000" height="5000" fill="white"/>
      <g transform="${frontCardRotation}">
        ${frontCard(262)} fill="none" stroke="black" stroke-width="44"/>
        <path d="${heartPath}" fill="black"/>
      </g>
    </mask>
    <mask id="heart" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000">
      <rect x="-2000" y="-2000" width="5000" height="5000" fill="white"/>
      <g transform="${frontCardRotation}"><path d="${heartPath}" fill="black"/></g>
    </mask>
  </defs>
  <g mask="url(#gap)"><g transform="${backCardRotation}">${backCard(270)} fill="white"/></g></g>
  <g mask="url(#heart)"><g transform="${frontCardRotation}">${frontCard(262)} fill="white"/></g></g>
  <path d="${sparklePath}" fill="white"/>`;

const iconBackground = `
  <defs>
    <radialGradient id="background" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="${dark.surface}"/>
      <stop offset="1" stop-color="${dark.background}"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#background)"/>`;

const artwork = {
  // The mark fills the icon, nudged down a little so the sparkle does not crowd the top edge.
  icon: `${svgOpen}${iconBackground}<g transform="translate(0 20)">${mark}</g></svg>`,
  // Android crops the foreground to a circle or squircle, so the mark stays inside the safe zone.
  'adaptive-foreground': `${svgOpen}${placed(0.62, mark)}</svg>`,
  'adaptive-monochrome': `${svgOpen}${placed(0.62, monochromeMark)}</svg>`,
  'splash-icon': `${svgOpen}${placed(0.9, mark)}</svg>`,
};

function renderPng(svg, size, outputPath) {
  execFileSync(
    'rsvg-convert',
    ['--width', size, '--height', size, '--format', 'png', '--output', outputPath],
    {
      input: svg,
    },
  );
}

mkdirSync(imagesDirectory, { recursive: true });
mkdirSync(storeDirectory, { recursive: true });

for (const [name, svg] of Object.entries(artwork)) {
  renderPng(svg, 1024, path.join(imagesDirectory, `${name}.png`));
}
renderPng(artwork.icon, 512, path.join(storeDirectory, 'play-icon-512.png'));
