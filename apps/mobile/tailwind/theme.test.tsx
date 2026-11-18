import { colorThemes, radiusScale, typeScale } from '@getfreak/tokens';
import { screen } from 'nativewind/test';
import { processColor, View } from 'react-native';

import { renderThemed } from './renderThemed';

const themeNames = ['light', 'dark'] as const;

function Probe({ label, className }: { label: string; className: string }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} className={className} />
  );
}

describe.each(themeNames)('with the device in %s mode', (themeName) => {
  const theme = colorThemes[themeName];
  // The compiler lower cases hex values.
  const resolved = (hex: string) => hex.toLowerCase();

  it('should resolve a semantic background class to that theme colour', async () => {
    await renderThemed(<Probe label="Ground" className="bg-background" />, themeName);

    expect(screen.getByRole('image', { name: 'Ground' })).toHaveStyle({
      backgroundColor: resolved(theme.background),
    });
  });

  it('should resolve a category fill class to that theme colour', async () => {
    await renderThemed(<Probe label="Fill" className="bg-category-c4" />, themeName);

    expect(screen.getByRole('image', { name: 'Fill' })).toHaveStyle({
      backgroundColor: resolved(theme.category.c4),
    });
  });

  it('should resolve the matching label colour on a category fill', async () => {
    await renderThemed(<Probe label="Label" className="border-on-category-c4" />, themeName);

    expect(screen.getByRole('image', { name: 'Label' })).toHaveStyle({
      borderColor: resolved(theme.onCategory.c4),
    });
  });
});

describe('sizes', () => {
  it('should give spacing and radius in px, not rem', async () => {
    await renderThemed(<Probe label="Box" className="p-16 gap-4 rounded-xl" />);

    expect(screen.getByRole('image', { name: 'Box' })).toHaveStyle({
      padding: 16,
      rowGap: 4,
      columnGap: 4,
      borderRadius: radiusScale.xl,
    });
  });

  it('should give a type class its family, size and line height in px', async () => {
    await renderThemed(<Probe label="Type" className="type-display" />);

    expect(screen.getByRole('image', { name: 'Type' })).toHaveStyle({
      fontFamily: typeScale.display.fontFamily,
      fontSize: typeScale.display.fontSize,
      lineHeight: typeScale.display.lineHeight,
    });
  });
});

describe('keyword values', () => {
  it('should resolve a transparent background', async () => {
    await renderThemed(<Probe label="Clear" className="bg-transparent" />);

    // The compiler rewrites the keyword to a fully transparent value, so compare as colours.
    const { backgroundColor } = screen.getByRole('image', { name: 'Clear' }).props.style;
    expect(processColor(backgroundColor)).toBe(processColor('transparent'));
  });

  it('should resolve a square corner', async () => {
    await renderThemed(<Probe label="Square" className="rounded-none" />);

    expect(screen.getByRole('image', { name: 'Square' })).toHaveStyle({ borderRadius: 0 });
  });
});

describe('one type system', () => {
  it('should not resolve the stock Tailwind size and weight classes', async () => {
    await renderThemed(<Probe label="Stock" className="text-sm font-bold" />);

    const style = screen.getByRole('image', { name: 'Stock' }).props.style;
    expect(style?.fontSize).toBeUndefined();
    expect(style?.fontWeight).toBeUndefined();
  });

  it('should still resolve the colour and type classes next to them', async () => {
    await renderThemed(<Probe label="Kept" className="text-foreground type-body" />);

    expect(screen.getByRole('image', { name: 'Kept' })).toHaveStyle({
      color: colorThemes.light.foreground.toLowerCase(),
      fontFamily: typeScale.body.fontFamily,
    });
  });
});
