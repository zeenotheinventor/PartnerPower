import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('should be 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('should be 1 for a colour against itself', () => {
    expect(contrastRatio('#3A1730', '#3A1730')).toBeCloseTo(1, 5);
  });

  it('should give the same ratio whichever colour is listed first', () => {
    expect(contrastRatio('#FF3D7F', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#FF3D7F'),
      10,
    );
  });

  it('should match the published value for mid grey on white', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('should ignore hex letter case', () => {
    expect(contrastRatio('#ff3d7f', '#ffffff')).toBeCloseTo(
      contrastRatio('#FF3D7F', '#FFFFFF'),
      10,
    );
  });
});
