import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { limits, type CategoryId, type CardKind } from '@getfreak/core';
import { waitFor } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo, Platform } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { makeOwnCardsFixture } from '../testing/ownCardsFixture';
import { MyDaresScreen } from './MyDaresScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

type Fixture = ReturnType<typeof makeOwnCardsFixture>;

async function addDare(
  fixture: Fixture,
  text: string,
  category: CategoryId = 'c1',
  kind: CardKind = 'solo',
) {
  const saved = await fixture.repository.savePlayerCard({ category, kind, text });
  if (!saved.ok) throw new Error('The test dare was not saved');
  return saved.saved;
}

async function renderList(fixture: Fixture = makeOwnCardsFixture()) {
  await renderThemed(
    <fixture.Providers>
      <MyDaresScreen />
    </fixture.Providers>,
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: copy.ownCards.add })).toBeOnTheScreen(),
  );
}

describe('MyDaresScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  describe('the screen', () => {
    it('should show the title as the heading', async () => {
      await renderList();

      expect(screen.getByRole('header', { name: copy.ownCards.listTitle })).toBeOnTheScreen();
    });

    it('should go back from the back button', async () => {
      await renderList();

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.backLabel }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should fall back to setup when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderList();

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should open the editor for a new dare from Write a dare', async () => {
      await renderList();

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.add }));

      expect(mockPush).toHaveBeenCalledWith('/games/dares/my-dares/new');
    });
  });

  describe('with no dares', () => {
    it('should invite the first dare', async () => {
      await renderList();

      expect(screen.getByText(copy.ownCards.emptyList)).toBeOnTheScreen();
    });

    it('should say none have been written', async () => {
      await renderList();

      expect(screen.getByText(copy.roundSetup.myDaresNone)).toBeOnTheScreen();
    });
  });

  describe('with dares', () => {
    it('should count them under the title', async () => {
      const fixture = makeOwnCardsFixture();
      await addDare(fixture, 'Placeholder dare 1');
      await addDare(fixture, 'Placeholder dare 2');
      await renderList(fixture);

      expect(
        screen.getByText(fillCopy(copy.roundSetup.myDaresCount, { count: 2 })),
      ).toBeOnTheScreen();
    });

    it('should not show the invitation', async () => {
      const fixture = makeOwnCardsFixture();
      await addDare(fixture, 'Placeholder dare 1');
      await renderList(fixture);

      expect(screen.queryByText(copy.ownCards.emptyList)).not.toBeOnTheScreen();
    });

    it('should group them by category in rank order, whatever order they were written in', async () => {
      const fixture = makeOwnCardsFixture();
      await addDare(fixture, 'Placeholder dare 1', 'c4');
      await addDare(fixture, 'Placeholder dare 2', 'c1');
      await addDare(fixture, 'Placeholder dare 3', 'c3');
      await renderList(fixture);

      const groupNames = screen
        .getAllByRole('header')
        .map((heading) => heading.props.accessibilityLabel)
        .filter(Boolean);
      expect(groupNames).toEqual([categoryNames.c1, categoryNames.c3, categoryNames.c4]);
    });

    it('should leave out a category that has no dares', async () => {
      const fixture = makeOwnCardsFixture();
      await addDare(fixture, 'Placeholder dare 1', 'c2');
      await renderList(fixture);

      expect(screen.queryByRole('header', { name: categoryNames.c1 })).not.toBeOnTheScreen();
      expect(screen.getByRole('header', { name: categoryNames.c2 })).toBeOnTheScreen();
    });

    it('should show how many dares each group holds', async () => {
      const fixture = makeOwnCardsFixture();
      await addDare(fixture, 'Placeholder dare 1', 'c2');
      await addDare(fixture, 'Placeholder dare 2', 'c2');
      await renderList(fixture);

      expect(screen.getByText('2')).toBeOnTheScreen();
    });

    it('should show each dare as a button named by its text', async () => {
      const fixture = makeOwnCardsFixture();
      await addDare(fixture, 'Placeholder dare 1');
      await renderList(fixture);

      expect(screen.getByRole('button', { name: 'Placeholder dare 1' })).toBeOnTheScreen();
    });

    it('should mark a together dare, in its name and with the Together chip', async () => {
      const fixture = makeOwnCardsFixture();
      await addDare(fixture, 'Placeholder dare 1', 'c1', 'together');
      await renderList(fixture);

      expect(
        screen.getByRole('button', {
          name: fillCopy(copy.ownCards.togetherCardLabel, { text: 'Placeholder dare 1' }),
        }),
      ).toBeOnTheScreen();
      expect(screen.getByText(copy.ownCards.kindTogether)).toBeOnTheScreen();
    });

    it('should not mark a dare for the partner as together', async () => {
      const fixture = makeOwnCardsFixture();
      await addDare(fixture, 'Placeholder dare 1', 'c1', 'solo');
      await renderList(fixture);

      expect(screen.queryByText(copy.ownCards.kindTogether)).not.toBeOnTheScreen();
    });

    it('should open a dare for editing when it is pressed', async () => {
      const fixture = makeOwnCardsFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1');
      await renderList(fixture);

      fireEvent.press(screen.getByRole('button', { name: 'Placeholder dare 1' }));

      expect(mockPush).toHaveBeenCalledWith(`/games/dares/my-dares/${dare.id}`);
    });
  });

  describe('at the limit', () => {
    async function renderAtLimit(count: number) {
      const fixture = makeOwnCardsFixture();
      for (let number = 1; number <= count; number += 1) {
        await addDare(fixture, `Placeholder dare ${number}`);
      }
      await renderList(fixture);
    }

    it('should switch Write a dare off and say why, at the most dares allowed', async () => {
      await renderAtLimit(limits.playerCards);

      expect(
        screen.getByRole('button', { name: copy.ownCards.add, disabled: true }),
      ).toBeOnTheScreen();
      expect(screen.getByText(copy.ownCards.limit)).toBeOnTheScreen();
    });

    it('should leave Write a dare on one dare short of the limit', async () => {
      await renderAtLimit(limits.playerCards - 1);

      expect(
        screen.getByRole('button', { name: copy.ownCards.add, disabled: false }),
      ).toBeOnTheScreen();
      expect(screen.queryByText(copy.ownCards.limit)).not.toBeOnTheScreen();
    });

    it('should not open the editor from a disabled Write a dare', async () => {
      await renderAtLimit(limits.playerCards);

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.add }));

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('the lost saved dares notice', () => {
    it('should say the saved dares could not be opened when the store started fresh', async () => {
      await renderList(makeOwnCardsFixture({ recoveredFromUnreadable: true }));

      expect(screen.getByText(copy.ownCards.notice)).toBeOnTheScreen();
    });

    it('should show no notice when nothing was lost', async () => {
      await renderList();

      expect(screen.queryByText(copy.ownCards.notice)).not.toBeOnTheScreen();
    });

    it('should show it once, and not on the next visit to the list', async () => {
      const fixture = makeOwnCardsFixture({ recoveredFromUnreadable: true });
      await renderThemed(
        <fixture.Providers>
          <MyDaresScreen />
        </fixture.Providers>,
      );
      await screen.findByText(copy.ownCards.notice);

      // The list is left and opened again, under the same providers.
      screen.rerender(<fixture.Providers>{null}</fixture.Providers>);
      screen.rerender(
        <fixture.Providers>
          <MyDaresScreen />
        </fixture.Providers>,
      );
      await screen.findByRole('button', { name: copy.ownCards.add });

      expect(screen.queryByText(copy.ownCards.notice)).not.toBeOnTheScreen();
    });

    it('should announce the notice on iOS, which has no live regions', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

      await renderList(makeOwnCardsFixture({ recoveredFromUnreadable: true }));

      expect(announce).toHaveBeenCalledWith(copy.ownCards.notice);
    });
  });

  it('should log nothing a player wrote', async () => {
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => {}),
    );
    const fixture = makeOwnCardsFixture();
    await addDare(fixture, 'Placeholder dare 1');
    await renderList(fixture);

    fireEvent.press(screen.getByRole('button', { name: 'Placeholder dare 1' }));

    expect(logs.flatMap((log) => log.mock.calls.flat()).join(' ')).not.toContain(
      'Placeholder dare',
    );
  });
});
