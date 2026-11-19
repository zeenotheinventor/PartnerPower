// Renders the whole cast as one static HTML page of plain SVG: every character, every mood, on the
// light and dark grounds, at 150, 96 and 64 dp. It reads the same art files and palette tokens as
// the app and composes the layers with the same `composeLayers`, so what you see is the art the
// app draws, at rest. Plain Node, no dependencies. Run it from the repository root:
//
//   node apps/mobile/characters/scripts/renderCastPreview.mjs [output.html] [--only gatekeeper] [--mood idle] [--zoom 2] [--view 60,90,120,60]
//
// The default output is `cast-preview.html` next to where you run it.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { characterIds } from '../../../../packages/core/src/characters.ts';
import { characterPalettes } from '../../../../packages/tokens/src/characters.ts';
import { colorThemes } from '../../../../packages/tokens/src/colors.ts';
import { composeLayers } from '../compose.ts';
import { bustViewBox, headViewBox } from '../types.ts';

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const only = option('--only');
const onlyMood = option('--mood');
const zoom = Number(option('--zoom') ?? 1);
// `--view x,y,width,height` draws one large close-up of that part of the canvas instead of the three sizes.
const closeUp = option('--view')?.split(',').map(Number);
const positional = args.filter(
  (arg, at) => !arg.startsWith('--') && !args[at - 1]?.startsWith('--'),
);
const outputPath = resolve(positional[0] ?? 'cast-preview.html');

const shapeToSvg = (shape, palette) => {
  const fill = shape.fill ? palette[shape.fill] : 'none';
  const stroke = shape.stroke ? palette[shape.stroke] : 'none';
  const attributes = [`d="${shape.d}"`, `fill="${fill}"`];
  if (shape.stroke) {
    attributes.push(`stroke="${stroke}"`, `stroke-width="${shape.strokeWidth ?? 1}"`);
    attributes.push('stroke-linecap="round"', 'stroke-linejoin="round"');
  }
  if (shape.opacity !== undefined) attributes.push(`opacity="${shape.opacity}"`);
  return `<path ${attributes.join(' ')}/>`;
};

const figureSvg = (art, mood, palette, viewBox, size) => {
  // The blink layer is only shown for a moment, so a still picture leaves it out.
  const layers = composeLayers(art, mood)
    .filter((layer) => layer.name !== 'blink')
    .map((layer) => layer.shapes.map((shape) => shapeToSvg(shape, palette)).join(''))
    .join('');
  const box = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
  return `<svg width="${size}" height="${size}" viewBox="${box}" overflow="hidden">${layers}</svg>`;
};

const grounds = [
  { name: 'light', background: colorThemes.light.background, surface: colorThemes.light.surface },
  { name: 'dark', background: colorThemes.dark.background, surface: colorThemes.dark.surface },
];

const rows = [];
for (const id of characterIds) {
  if (only && only !== id) continue;
  const art = (await import(`../${id}.ts`))[`${id}Art`];
  for (const mood of Object.keys(art.moods)) {
    if (onlyMood && onlyMood !== mood) continue;
    const cells = grounds
      .map(({ name, background }) => {
        const palette = characterPalettes[id][name];
        const figures = closeUp
          ? [
              figureSvg(
                art,
                mood,
                palette,
                { x: closeUp[0], y: closeUp[1], width: closeUp[2], height: closeUp[3] },
                600 * zoom,
              ),
            ]
          : [
              figureSvg(art, mood, palette, bustViewBox, 150 * zoom),
              figureSvg(art, mood, palette, bustViewBox, 96 * zoom),
              figureSvg(art, mood, palette, headViewBox, 64 * zoom),
            ];
        return `<td class="ground" style="background:${background}">${figures.join('')}</td>`;
      })
      .join('');
    rows.push(`<tr><th>${id}<br>${mood}</th>${cells}</tr>`);
  }
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>Get Freak cast preview</title>
<style>
  body { font: 13px system-ui, sans-serif; margin: 16px; background: gray; }
  table { border-collapse: separate; border-spacing: 6px; }
  th { text-align: left; color: white; padding-right: 8px; }
  td.ground { padding: 8px; border-radius: 12px; }
  td.ground svg { margin-right: 10px; vertical-align: bottom; }
</style>
<table>${rows.join('')}</table>`;

writeFileSync(outputPath, html);
console.log(`Wrote ${outputPath}`);
