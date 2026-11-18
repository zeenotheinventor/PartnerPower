import { radiusScale, spacingScale, typeScale } from './scales';

describe('spacingScale', () => {
  it('should sit on a 4 point grid', () => {
    expect(spacingScale).toEqual([0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]);
  });
});

describe('radiusScale', () => {
  it('should list the corner radii in points', () => {
    expect(radiusScale).toEqual({ sm: 8, md: 12, lg: 16, xl: 24, pill: 999 });
  });
});

describe('typeScale', () => {
  it('should give each style its size and line height', () => {
    expect(
      Object.fromEntries(
        Object.entries(typeScale).map(([name, style]) => [
          name,
          [style.fontSize, style.lineHeight],
        ]),
      ),
    ).toEqual({
      display: [34, 38],
      title: [26, 30],
      heading: [20, 26],
      body: [16, 22],
      bodyBold: [16, 22],
      label: [14, 18],
      caption: [12, 16],
    });
  });

  it('should track the label and caption in points and leave the others untracked', () => {
    expect(
      Object.fromEntries(
        Object.entries(typeScale).map(([name, style]) => [
          name,
          'letterSpacing' in style ? style.letterSpacing : undefined,
        ]),
      ),
    ).toEqual({
      display: undefined,
      title: undefined,
      heading: undefined,
      body: undefined,
      bodyBold: undefined,
      label: 0.8,
      caption: 0.7,
    });
  });

  it('should set display, title and heading in the display font at weight 800', () => {
    for (const name of ['display', 'title', 'heading'] as const) {
      expect(typeScale[name].fontFamily).toBe('Baloo2_800ExtraBold');
    }
  });

  it('should set body in Nunito 500 and bold body in Nunito 700', () => {
    expect(typeScale.body.fontFamily).toBe('Nunito_500Medium');
    expect(typeScale.bodyBold.fontFamily).toBe('Nunito_700Bold');
  });

  it('should set label and caption in Nunito 800', () => {
    expect(typeScale.label.fontFamily).toBe('Nunito_800ExtraBold');
    expect(typeScale.caption.fontFamily).toBe('Nunito_800ExtraBold');
  });
});
