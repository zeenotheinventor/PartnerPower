import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';
import { StyleSheet, Text } from 'react-native';

import { hostViewInside } from '../../../tailwind/hostViewsInside';
import { renderThemed } from '../../../tailwind/renderThemed';
import { Card } from './Card';

const themeNames = ['light', 'dark'] as const;
const categoryIds = ['c1', 'c2', 'c3', 'c4'] as const;

function downwardShift(element: ReturnType<typeof screen.getByRole>): number {
  const transforms: Array<{ translateY?: number }> =
    StyleSheet.flatten(element.props.style).transform ?? [];
  return transforms.find((transform) => transform.translateY !== undefined)?.translateY ?? 0;
}

describe('Card', () => {
  describe('when it is not pressable', () => {
    it('should be a group named by the text inside it', async () => {
      await renderThemed(
        <Card>
          <Text>Card 1</Text>
        </Card>,
      );

      expect(screen.getByRole('group', { name: 'Card 1' })).toBeOnTheScreen();
    });

    it('should be one group by default, so a screen reader reads its text together', async () => {
      await renderThemed(
        <Card>
          <Text accessibilityRole="header">Card title</Text>
          <Text>Card body</Text>
        </Card>,
      );

      expect(screen.getByRole('group')).toBeOnTheScreen();
    });

    it('should not be a group when it is not grouped, so its children are read separately', async () => {
      await renderThemed(
        <Card grouped={false}>
          <Text accessibilityRole="header">Card title</Text>
          <Text>Card body</Text>
        </Card>,
      );

      expect(screen.queryByRole('group')).not.toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'Card title' })).toBeOnTheScreen();
      expect(screen.getByText('Card body')).toBeOnTheScreen();
    });

    describe.each(themeNames)('with the device in %s mode', (themeName) => {
      const theme = colorThemes[themeName];

      it('should draw the border colour as its edge when it has no category', async () => {
        await renderThemed(
          <Card>
            <Text>Card 1</Text>
          </Card>,
          themeName,
        );

        expect(screen.getByRole('group', { name: 'Card 1' })).toHaveStyle({
          backgroundColor: theme.border.toLowerCase(),
        });
      });

      it('should draw the deep accent colour as its edge and the accent as its border when accented', async () => {
        await renderThemed(
          <Card category="c1" accent>
            <Text>Card 1</Text>
          </Card>,
          themeName,
        );

        const card = screen.getByRole('group', { name: 'Card 1' });
        expect(card).toHaveStyle({ backgroundColor: theme.accentDeep.toLowerCase() });
        expect(hostViewInside(card, 0)).toHaveStyle({ borderColor: theme.accent.toLowerCase() });
      });

      it.each(categoryIds)(
        'should draw the colour of category %s as its edge',
        async (category) => {
          await renderThemed(
            <Card category={category}>
              <Text>Card 1</Text>
            </Card>,
            themeName,
          );

          expect(screen.getByRole('group', { name: 'Card 1' })).toHaveStyle({
            backgroundColor: theme.category[category].toLowerCase(),
          });
        },
      );
    });
  });

  describe('when it is pressable', () => {
    it('should be a button named by its label', async () => {
      await renderThemed(
        <Card label="First game" onPress={jest.fn()}>
          <Text>Card 1</Text>
        </Card>,
      );

      expect(screen.getByRole('button', { name: 'First game' })).toBeOnTheScreen();
    });

    it('should call the handler when pressed', async () => {
      const onPress = jest.fn();
      await renderThemed(
        <Card label="First game" onPress={onPress}>
          <Text>Card 1</Text>
        </Card>,
      );

      fireEvent.press(screen.getByRole('button', { name: 'First game' }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not call the handler when disabled', async () => {
      const onPress = jest.fn();
      await renderThemed(
        <Card label="First game" onPress={onPress} disabled>
          <Text>Card 1</Text>
        </Card>,
      );

      fireEvent.press(screen.getByRole('button', { name: 'First game' }));

      expect(onPress).not.toHaveBeenCalled();
    });

    it('should expose the disabled state and dim itself', async () => {
      await renderThemed(
        <Card label="First game" onPress={jest.fn()} disabled>
          <Text>Card 1</Text>
        </Card>,
      );

      const card = screen.getByRole('button', { name: 'First game', disabled: true });
      expect(card).toHaveStyle({ opacity: 0.5 });
    });

    it('should sink onto its edge while pressed', async () => {
      await renderThemed(
        <Card label="First game" onPress={jest.fn()}>
          <Text>Card 1</Text>
        </Card>,
      );
      const card = screen.getByRole('button', { name: 'First game' });
      const face = hostViewInside(card, 1);

      expect(downwardShift(face)).toBe(0);
      fireEvent(card, 'pressIn');
      expect(downwardShift(face)).toBe(4);
      fireEvent(card, 'pressOut');
      expect(downwardShift(face)).toBe(0);
    });

    it('should place the edge under the face and leave the card itself without a fill', async () => {
      await renderThemed(
        <Card label="First game" onPress={jest.fn()}>
          <Text>Card 1</Text>
        </Card>,
      );
      const card = screen.getByRole('button', { name: 'First game' });
      const edge = hostViewInside(card, 0);

      expect(edge).toHaveStyle({ position: 'absolute', top: 4, bottom: 0 });
      expect(StyleSheet.flatten(card.props.style)?.backgroundColor).toBeUndefined();
    });

    describe.each(themeNames)('with the device in %s mode', (themeName) => {
      const theme = colorThemes[themeName];

      it('should draw the border colour as its edge and the surface as its face', async () => {
        await renderThemed(
          <Card label="First game" onPress={jest.fn()}>
            <Text>Card 1</Text>
          </Card>,
          themeName,
        );

        const card = screen.getByRole('button', { name: 'First game' });
        const edge = hostViewInside(card, 0);
        const face = hostViewInside(card, 1);
        expect(edge).toHaveStyle({ backgroundColor: theme.border.toLowerCase() });
        expect(face).toHaveStyle({
          backgroundColor: theme.surface.toLowerCase(),
          borderColor: theme.border.toLowerCase(),
        });
      });

      it.each(categoryIds)('should tint its edge and border with category %s', async (category) => {
        await renderThemed(
          <Card label="First game" category={category} onPress={jest.fn()}>
            <Text>Card 1</Text>
          </Card>,
          themeName,
        );

        const card = screen.getByRole('button', { name: 'First game' });
        const edge = hostViewInside(card, 0);
        const face = hostViewInside(card, 1);
        expect(edge).toHaveStyle({ backgroundColor: theme.category[category].toLowerCase() });
        expect(face).toHaveStyle({ borderColor: theme.category[category].toLowerCase() });
      });
    });
  });
  describe('when it is face down', () => {
    const faceDown = <Card faceDown title="Hidden card" mark="?" label="Hidden card, face down" />;

    it('should be one image named by its label, with its mark and title not read separately', async () => {
      await renderThemed(faceDown);

      expect(screen.getByRole('img', { name: 'Hidden card, face down' })).toBeOnTheScreen();
    });

    it('should draw its mark and its title', async () => {
      await renderThemed(faceDown);

      expect(screen.getByText('?')).toBeOnTheScreen();
      expect(screen.getByText('Hidden card')).toBeOnTheScreen();
    });

    it('should not be pressable', async () => {
      await renderThemed(faceDown);

      expect(screen.queryByRole('button')).not.toBeOnTheScreen();
    });

    describe.each(themeNames)('with the device in %s mode', (themeName) => {
      const theme = colorThemes[themeName];

      it('should draw the deep accent colour as its edge and the accent as its back', async () => {
        await renderThemed(faceDown, themeName);

        const card = screen.getByRole('img', { name: 'Hidden card, face down' });
        expect(card).toHaveStyle({ backgroundColor: theme.accentDeep.toLowerCase() });
        expect(hostViewInside(card, 0)).toHaveStyle({
          backgroundColor: theme.accent.toLowerCase(),
          borderColor: theme.accent.toLowerCase(),
        });
      });

      it('should set its mark and title in the colour that sits on the accent', async () => {
        await renderThemed(faceDown, themeName);

        expect(screen.getByText('?')).toHaveStyle({ color: theme.onAccent.toLowerCase() });
        expect(screen.getByText('Hidden card')).toHaveStyle({
          color: theme.onAccent.toLowerCase(),
        });
      });
    });
  });
});
