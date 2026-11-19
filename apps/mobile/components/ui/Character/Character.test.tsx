import { characterPalettes } from '@getfreak/tokens';
import { screen } from 'nativewind/test';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion, withRepeat } from 'react-native-reanimated';

import type { CharacterId } from '@getfreak/core';

import { characters, sizeInDp } from '../../../characters';
import { renderThemed } from '../../../tailwind/renderThemed';
import { Character, sizeClasses } from './Character';

beforeEach(() => {
  jest.mocked(useReducedMotion).mockReturnValue(false);
  jest.mocked(withRepeat).mockClear();
});

// A character is decorative, so it has no role or name to query by. These tests read the drawn
// paths from the SVG tree instead.
// Widens a role to the whole union, as a screen that only knows an id would.
const asRole = (id: CharacterId): CharacterId => id;
const sizeNames = ['tile', 'medium', 'hero'] as const;

const drawnPaths = () => screen.UNSAFE_getAllByType(Path).map((path) => path.props);

describe('Character', () => {
  it('should be hidden from screen readers on both platforms', async () => {
    await renderThemed(<Character character="gatekeeper" mood="idle" size="hero" />);

    const root = screen.toJSON();
    expect(root).toMatchObject({
      props: {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
        'aria-hidden': true,
      },
    });
  });

  it('should have no role and no label', async () => {
    await renderThemed(<Character character="gatekeeper" mood="idle" size="hero" />);

    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(/./)).not.toBeOnTheScreen();
  });

  it('should draw the mouth of the mood it is given', async () => {
    await renderThemed(<Character character="gatekeeper" mood="shocked" size="medium" />);

    const [shockedMouth] = characters.gatekeeper.moods.shocked.face.mouth;
    const [idleMouth] = characters.gatekeeper.moods.idle.face.mouth;
    const drawn = drawnPaths().map((path) => path.d);
    expect(drawn).toContain(shockedMouth?.d);
    expect(drawn).not.toContain(idleMouth?.d);
  });

  it('should draw a pose that only this character has', async () => {
    await renderThemed(<Character character="gatekeeper" mood="armsCrossed" size="hero" />);

    const [crossedArm] = characters.gatekeeper.moods.armsCrossed.armLeft.shapes;
    expect(drawnPaths().map((path) => path.d)).toContain(crossedArm?.d);
  });

  it('should colour the art from the light palette in the light theme', async () => {
    await renderThemed(<Character character="gatekeeper" mood="idle" size="hero" />, 'light');

    const fills = drawnPaths().map((path) => path.fill);
    expect(fills).toContain(characterPalettes.gatekeeper.light.skin);
    expect(fills).not.toContain(characterPalettes.gatekeeper.dark.rim);
  });

  it('should colour the art from the dark palette in the dark theme', async () => {
    await renderThemed(<Character character="gatekeeper" mood="idle" size="hero" />, 'dark');

    expect(drawnPaths().map((path) => path.fill)).toContain(characterPalettes.gatekeeper.dark.rim);
  });

  it('should refuse a mood the character cannot show', () => {
    // @ts-expect-error The gatekeeper has no wave, which is the host's pose.
    const unsupported = <Character character="gatekeeper" mood="wave" size="tile" />;
    expect(unsupported).toBeTruthy();
  });

  it('should refuse a mood the role cannot show even when the role is only known as an id', () => {
    const role = asRole('gatekeeper');
    // @ts-expect-error A CharacterId could be any role, so a pose of one role is not allowed.
    const unsupported = <Character character={role} mood="wave" size="tile" />;
    expect(unsupported).toBeTruthy();
  });

  it('should draw the idle mood when it is given a mood the character does not have', async () => {
    await renderThemed(
      // @ts-expect-error The gatekeeper has no wave. The component must still not throw.
      <Character character="gatekeeper" mood="wave" size="medium" />,
    );

    const [idleMouth] = characters.gatekeeper.moods.idle.face.mouth;
    expect(drawnPaths().map((path) => path.d)).toContain(idleMouth?.d);
  });

  it('should keep its size classes equal to its sizes in dp', () => {
    for (const name of sizeNames) {
      expect(sizeClasses[name]).toContain(`h-[${sizeInDp[name]}px] w-[${sizeInDp[name]}px]`);
    }
  });

  describe.each([
    ['tile', 64],
    ['medium', 96],
    ['hero', 150],
  ] as const)('the %s size', (size, dp) => {
    it(`should draw each layer ${dp} dp square`, async () => {
      await renderThemed(<Character character="host" mood="idle" size={size} />);

      const svgs = screen.UNSAFE_getAllByType(Svg);
      expect(svgs.length).toBeGreaterThan(5);
      for (const svg of svgs) {
        expect(svg.props.width).toBe(dp);
        expect(svg.props.height).toBe(dp);
      }
    });
  });

  it('should show the head crop when asked', async () => {
    await renderThemed(<Character character="host" mood="idle" size="tile" crop="head" />);

    const [svg] = screen.UNSAFE_getAllByType(Svg);
    expect(svg?.props.viewBox).toBe('49 19 143 143');
  });

  describe('motion', () => {
    it('should start its loops when motion is allowed', async () => {
      await renderThemed(<Character character="host" mood="wave" size="hero" />);

      expect(withRepeat).toHaveBeenCalled();
    });

    it('should start no loop when the player prefers reduced motion', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);

      await renderThemed(<Character character="host" mood="wave" size="hero" />);

      expect(withRepeat).not.toHaveBeenCalled();
    });

    it('should draw a still pose with no loops when it is not animated', async () => {
      await renderThemed(<Character character="host" mood="wave" size="hero" animated={false} />);

      expect(withRepeat).not.toHaveBeenCalled();
      expect(screen.UNSAFE_getAllByType(Svg)).toHaveLength(1);
    });

    it('should still draw the mood as a still pose when motion is reduced', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);

      await renderThemed(<Character character="host" mood="wave" size="hero" />);

      const [wavingArm] = characters.host.moods.wave.armRight.shapes;
      expect(drawnPaths().map((path) => path.d)).toContain(wavingArm?.d);
    });
  });
});
