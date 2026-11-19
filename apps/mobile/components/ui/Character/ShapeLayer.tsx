import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

import type { CharacterPalette } from '@getfreak/tokens';

import type { Shape, ViewBox } from '../../../characters';

type ShapeLayerProps = {
  shapes: readonly Shape[];
  palette: CharacterPalette;
  viewBox: ViewBox;
  size: number;
};

/** One flat layer of the figure: an SVG of paths, coloured from the palette. */
export const ShapeLayer = memo(function ShapeLayer({
  shapes,
  palette,
  viewBox,
  size,
}: ShapeLayerProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
    >
      {shapes.map((shape, index) => (
        <Path
          key={index}
          d={shape.d}
          fill={shape.fill ? palette[shape.fill] : 'none'}
          stroke={shape.stroke ? palette[shape.stroke] : undefined}
          strokeWidth={shape.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={shape.opacity}
        />
      ))}
    </Svg>
  );
});
