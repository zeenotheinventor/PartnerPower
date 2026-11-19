import { categoryNames, copy } from '@getfreak/content';
import { limits, type CardKind, type CategoryId } from '@getfreak/core';
import { act, waitFor } from '@testing-library/react-native';
import { fireEvent, screen, within } from 'nativewind/test';
import { AccessibilityInfo, KeyboardAvoidingView } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { makeOwnCardsFixture } from '../testing/ownCardsFixture';
import { DareEditorScreen } from './DareEditorScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
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

async function renderEditor(fixture: Fixture = makeOwnCardsFixture(), dareId?: string) {
  await renderThemed(
    <fixture.Providers>
      <DareEditorScreen dareId={dareId} />
    </fixture.Providers>,
  );
  await screen.findByRole('header', { name: copy.ownCards.editorTitle });
  await waitFor(() => expect(saveButton()).toBeOnTheScreen());
}

const saveButton = () => screen.getByRole('button', { name: copy.ownCards.save });
const dareField = () => screen.getByLabelText(copy.ownCards.fieldLabel);
const typeDare = (text: string) => fireEvent.changeText(dareField(), text);

// Saving finishes after the press, so the test waits for it to settle.
async function pressSave() {
  fireEvent.press(saveButton());
  await act(async () => {});
}

describe('DareEditorScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  describe('the screen', () => {
    it('should show the title as the heading', async () => {
      await renderEditor();

      expect(screen.getByRole('header', { name: copy.ownCards.editorTitle })).toBeOnTheScreen();
    });

    it('should go back from the back button', async () => {
      await renderEditor();

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.backLabel }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should fall back to the list when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderEditor();

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith('/games/dares/my-dares');
    });

    it('should move its content out of the way of the keyboard', async () => {
      await renderEditor();

      // React Native has no role or label to find this view by, so it is found by its type.
      expect(screen.UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
    });

    it('should keep Save inside the view that moves out of the way of the keyboard', async () => {
      await renderEditor();

      const avoidingView = screen.UNSAFE_getByType(KeyboardAvoidingView);
      expect(
        within(avoidingView).getByRole('button', { name: copy.ownCards.save }),
      ).toBeOnTheScreen();
    });
  });

  describe('a new dare', () => {
    it('should have a multiline field with a count against 140 characters', async () => {
      await renderEditor();

      expect(dareField()).toHaveProp('multiline', true);
      expect(screen.getByText('0/140', { includeHiddenElements: true })).toBeOnTheScreen();
    });

    it('should not stop typing at 140 characters, so the message can show', async () => {
      await renderEditor();

      expect(dareField()).not.toHaveProp('maxLength', expect.anything());
    });

    it('should start on the first category and for the partner', async () => {
      await renderEditor();

      expect(
        screen.getByRole('button', { name: categoryNames.c1, selected: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('radio', { name: copy.ownCards.kindSolo, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should offer all four categories', async () => {
      await renderEditor();

      for (const name of Object.values(categoryNames)) {
        expect(screen.getByRole('button', { name })).toBeOnTheScreen();
      }
    });

    it('should choose a category when its chip is pressed, and only that one', async () => {
      await renderEditor();

      fireEvent.press(screen.getByRole('button', { name: categoryNames.c3 }));

      expect(
        screen.getByRole('button', { name: categoryNames.c3, selected: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: categoryNames.c1, selected: false }),
      ).toBeOnTheScreen();
    });

    it('should choose together when it is pressed', async () => {
      await renderEditor();

      fireEvent.press(screen.getByRole('radio', { name: copy.ownCards.kindTogether }));

      expect(
        screen.getByRole('radio', { name: copy.ownCards.kindTogether, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should count the characters as they are typed', async () => {
      await renderEditor();

      typeDare('Placeholder dare 1');

      expect(screen.getByText('18/140', { includeHiddenElements: true })).toBeOnTheScreen();
    });

    it('should count the tidied text, so the count matches the rule', async () => {
      await renderEditor();

      typeDare('  Placeholder    dare  ');

      expect(screen.getByText('16/140', { includeHiddenElements: true })).toBeOnTheScreen();
    });

    it('should have no delete button', async () => {
      await renderEditor();

      expect(
        screen.queryByRole('button', { name: copy.ownCards.deleteButton }),
      ).not.toBeOnTheScreen();
    });

    it('should switch Save off while the field is empty', async () => {
      await renderEditor();

      expect(
        screen.getByRole('button', { name: copy.ownCards.save, disabled: true }),
      ).toBeOnTheScreen();
    });

    it('should switch Save on once something is written', async () => {
      await renderEditor();

      typeDare('Placeholder dare 1');

      expect(
        screen.getByRole('button', { name: copy.ownCards.save, disabled: false }),
      ).toBeOnTheScreen();
    });

    it('should switch Save off again when the text is cleared', async () => {
      await renderEditor();
      typeDare('Placeholder dare 1');

      typeDare('');

      expect(
        screen.getByRole('button', { name: copy.ownCards.save, disabled: true }),
      ).toBeOnTheScreen();
    });

    it('should keep Save off until the store has loaded, because nothing may be written before', async () => {
      const fixture = makeOwnCardsFixture({ holdLoad: true });
      await renderThemed(
        <fixture.Providers>
          <DareEditorScreen />
        </fixture.Providers>,
      );
      typeDare('Placeholder dare 1');

      expect(
        screen.getByRole('button', { name: copy.ownCards.save, disabled: true }),
      ).toBeOnTheScreen();

      await act(async () => {
        fixture.releaseLoad();
      });

      expect(
        screen.getByRole('button', { name: copy.ownCards.save, disabled: false }),
      ).toBeOnTheScreen();
    });
  });

  describe('saving a new dare', () => {
    it('should store it with the category and who it is for, then go back', async () => {
      const fixture = makeOwnCardsFixture();
      await renderEditor(fixture);
      typeDare('Placeholder dare 1');
      fireEvent.press(screen.getByRole('button', { name: categoryNames.c4 }));
      fireEvent.press(screen.getByRole('radio', { name: copy.ownCards.kindTogether }));

      await pressSave();

      expect(await fixture.repository.listPlayerCards()).toEqual([
        expect.objectContaining({ text: 'Placeholder dare 1', category: 'c4', kind: 'together' }),
      ]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should tidy the text before it is stored', async () => {
      const fixture = makeOwnCardsFixture();
      await renderEditor(fixture);
      typeDare('  Placeholder \n  dare   1 ');

      await pressSave();

      expect(await fixture.repository.listPlayerCards()).toEqual([
        expect.objectContaining({ text: 'Placeholder dare 1' }),
      ]);
    });

    it('should save once when Save is pressed twice at once', async () => {
      const fixture = makeOwnCardsFixture();
      await renderEditor(fixture);
      typeDare('Placeholder dare 1');
      const savePlayerCard = jest.spyOn(fixture.repository, 'savePlayerCard');

      fireEvent.press(saveButton());
      fireEvent.press(saveButton());
      await act(async () => {});

      expect(savePlayerCard).toHaveBeenCalledTimes(1);
    });
  });

  describe('a dare that cannot be saved', () => {
    it('should say to write one first when the text is only spaces, and store nothing', async () => {
      const fixture = makeOwnCardsFixture();
      await renderEditor(fixture);
      typeDare('   ');

      await pressSave();

      expect(
        screen.getByText(copy.ownCards.emptyError, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(await fixture.repository.listPlayerCards()).toEqual([]);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should say it is too long when it is over 140 characters, and store nothing', async () => {
      const fixture = makeOwnCardsFixture();
      await renderEditor(fixture);
      typeDare('x'.repeat(limits.cardTextLength + 1));

      await pressSave();

      expect(
        screen.getByText(copy.ownCards.tooLongError, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(screen.getByText('141/140', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(await fixture.repository.listPlayerCards()).toEqual([]);
    });

    it('should accept a dare of exactly 140 characters', async () => {
      const fixture = makeOwnCardsFixture();
      await renderEditor(fixture);
      typeDare('x'.repeat(limits.cardTextLength));

      await pressSave();

      expect(await fixture.repository.listPlayerCards()).toHaveLength(1);
    });

    it('should say it is already written when it repeats another of their dares', async () => {
      const fixture = makeOwnCardsFixture();
      await addDare(fixture, 'Placeholder dare 1');
      await renderEditor(fixture);
      typeDare('placeholder   DARE 1');

      await pressSave();

      expect(
        screen.getByText(copy.ownCards.duplicateError, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(await fixture.repository.listPlayerCards()).toHaveLength(1);
    });

    it('should say it is already written when it repeats a card of the shipped deck', async () => {
      const fixture = makeOwnCardsFixture({ shippedTexts: ['Shipped card 1'] });
      await renderEditor(fixture);
      typeDare('Shipped card 1');

      await pressSave();

      expect(
        screen.getByText(copy.ownCards.duplicateError, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('should read the message with the field, and announce it', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await renderEditor();
      typeDare('   ');

      await pressSave();

      expect(dareField()).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(copy.ownCards.emptyError),
      );
      expect(announce).toHaveBeenCalledWith(copy.ownCards.emptyError);
    });

    it('should say the count in words with the field', async () => {
      await renderEditor();

      typeDare('Placeholder dare 1');

      expect(dareField()).toHaveProp('accessibilityHint', '18 of 140 characters');
    });

    it('should take the message away when the text is changed', async () => {
      await renderEditor();
      typeDare('   ');
      await pressSave();

      typeDare('Placeholder dare 1');

      expect(
        screen.queryByText(copy.ownCards.emptyError, { includeHiddenElements: true }),
      ).not.toBeOnTheScreen();
    });

    it('should let a corrected dare be saved after a message', async () => {
      const fixture = makeOwnCardsFixture();
      await renderEditor(fixture);
      typeDare('   ');
      await pressSave();
      typeDare('Placeholder dare 1');

      await pressSave();

      expect(await fixture.repository.listPlayerCards()).toHaveLength(1);
    });

    it('should say the limit is reached when the store is full', async () => {
      const fixture = makeOwnCardsFixture();
      for (let number = 1; number <= limits.playerCards; number += 1) {
        await addDare(fixture, `Placeholder dare ${number}`);
      }
      await renderEditor(fixture);
      typeDare('One more');

      await pressSave();

      expect(
        screen.getByText(copy.ownCards.limit, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should say it could not save when the write fails, and allow another try', async () => {
      const fixture = makeOwnCardsFixture();
      await renderEditor(fixture);
      typeDare('Placeholder dare 1');
      jest.spyOn(fixture.repository, 'savePlayerCard').mockRejectedValueOnce(new Error('disk'));

      await pressSave();

      expect(
        screen.getByText(copy.ownCards.writeFailed, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(mockBack).not.toHaveBeenCalled();

      await pressSave();

      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('editing a dare', () => {
    it('should show the dare in the form', async () => {
      const fixture = makeOwnCardsFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1', 'c3', 'together');

      await renderEditor(fixture, dare.id);

      expect(dareField()).toHaveDisplayValue('Placeholder dare 1');
      expect(
        screen.getByRole('button', { name: categoryNames.c3, selected: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('radio', { name: copy.ownCards.kindTogether, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should save the changes to the same dare', async () => {
      const fixture = makeOwnCardsFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1', 'c1', 'solo');
      await renderEditor(fixture, dare.id);
      typeDare('Placeholder dare 2');
      fireEvent.press(screen.getByRole('button', { name: categoryNames.c2 }));

      await pressSave();

      expect(await fixture.repository.listPlayerCards()).toEqual([
        { ...dare, text: 'Placeholder dare 2', category: 'c2' },
      ]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should not call a dare a repeat of itself when it is saved unchanged', async () => {
      const fixture = makeOwnCardsFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1');
      await renderEditor(fixture, dare.id);

      await pressSave();

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should go back to the list when no dare has that id', async () => {
      await renderThemed(
        <DareEditorHost
          fixture={makeOwnCardsFixture()}
          dareId="p-00000000-0000-4000-8000-0000000000ff"
        />,
      );

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/games/dares/my-dares'));
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it('should stay on the editor when the dare is there', async () => {
      const fixture = makeOwnCardsFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1');

      await renderEditor(fixture, dare.id);

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('deleting a dare', () => {
    async function renderEditingDare() {
      const fixture = makeOwnCardsFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1');
      await fixture.repository.setFavourite(dare.id, true);
      await fixture.repository.saveDeck({ name: 'Placeholder deck', cardIds: [dare.id] });
      await renderEditor(fixture, dare.id);
      return { fixture, dare };
    }

    it('should offer Delete dare when editing', async () => {
      await renderEditingDare();

      expect(screen.getByRole('button', { name: copy.ownCards.deleteButton })).toBeOnTheScreen();
    });

    it('should not show the dialog until Delete dare is pressed', async () => {
      await renderEditingDare();

      expect(screen.queryByLabelText(copy.ownCards.deleteTitle)).not.toBeOnTheScreen();
    });

    it('should ask to confirm with the dialog, with its line and both buttons', async () => {
      await renderEditingDare();

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteButton }));

      expect(screen.getByLabelText(copy.ownCards.deleteTitle)).toHaveProp('role', 'alertdialog');
      expect(screen.getByText(copy.ownCards.deleteBody)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.ownCards.deleteConfirm })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.ownCards.deleteCancel })).toBeOnTheScreen();
    });

    it('should keep the dare when Keep it is pressed', async () => {
      const { fixture } = await renderEditingDare();
      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteButton }));

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteCancel }));
      await act(async () => {});

      expect(screen.queryByLabelText(copy.ownCards.deleteTitle)).not.toBeOnTheScreen();
      expect(await fixture.repository.listPlayerCards()).toHaveLength(1);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should delete the dare, then go back', async () => {
      const { fixture } = await renderEditingDare();
      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteButton }));

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteConfirm }));
      await act(async () => {});

      expect(await fixture.repository.listPlayerCards()).toEqual([]);
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should take the dare out of the favourites and the decks too', async () => {
      const { fixture } = await renderEditingDare();
      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteButton }));

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteConfirm }));
      await act(async () => {});

      expect(await fixture.repository.listFavourites()).toEqual([]);
      expect(await fixture.repository.listDecks()).toEqual([
        expect.objectContaining({ cardIds: [] }),
      ]);
    });

    it('should say it could not delete when the write fails, and keep the form', async () => {
      const { fixture } = await renderEditingDare();
      jest.spyOn(fixture.repository, 'deletePlayerCard').mockRejectedValueOnce(new Error('disk'));
      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteButton }));

      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteConfirm }));
      await act(async () => {});

      expect(
        screen.getByText(copy.ownCards.writeFailed, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(await fixture.repository.listPlayerCards()).toHaveLength(1);
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  it('should log nothing a player wrote', async () => {
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => {}),
    );
    await renderEditor();
    typeDare('Placeholder dare 1');

    await pressSave();

    expect(logs.flatMap((log) => log.mock.calls.flat()).join(' ')).not.toContain(
      'Placeholder dare',
    );
  });
});

// Shows the editor for an id from the first render, without waiting for the form.
function DareEditorHost({ fixture, dareId }: { fixture: Fixture; dareId: string }) {
  return (
    <fixture.Providers>
      <DareEditorScreen dareId={dareId} />
    </fixture.Providers>
  );
}
