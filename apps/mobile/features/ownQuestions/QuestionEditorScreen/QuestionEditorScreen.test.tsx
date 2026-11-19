import { categoryNames, copy, fillCopy, questionFormatNames, topicNames } from '@getfreak/content';
import { limits } from '@getfreak/core';
import { act, waitFor } from '@testing-library/react-native';
import { fireEvent, screen, within } from 'nativewind/test';
import { AccessibilityInfo, KeyboardAvoidingView } from 'react-native';

import type { QuestionDraft } from '../../../storage';
import { renderThemed } from '../../../tailwind/renderThemed';
import { makeOwnQuestionsFixture } from '../testing/ownQuestionsFixture';
import { QuestionEditorScreen } from './QuestionEditorScreen';

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

type Fixture = ReturnType<typeof makeOwnQuestionsFixture>;

const message = copy.ownQuestions;

async function addQuestion(fixture: Fixture, draft: Partial<QuestionDraft> = {}) {
  const saved = await fixture.repository.savePlayerQuestion({
    format: 'ifYou',
    category: 'c1',
    topic: 't1',
    text: 'Placeholder question 1',
    ...draft,
  });
  if (!saved.ok) throw new Error('The test question was not saved');
  return saved.saved;
}

async function renderEditor(fixture: Fixture = makeOwnQuestionsFixture(), questionId?: string) {
  await renderThemed(
    <fixture.Providers>
      <QuestionEditorScreen questionId={questionId} />
    </fixture.Providers>,
  );
  await screen.findByRole('header', {
    name: questionId ? message.titleEdit : message.titleNew,
  });
  await waitFor(() => expect(saveButton()).toBeOnTheScreen());
}

const saveButton = () => screen.getByRole('button', { name: message.save });
const textField = () => screen.getByLabelText(message.textLabel);
const optionField = (number: number) =>
  screen.getByLabelText(fillCopy(message.optionLabel, { number }));
const typeText = (text: string) => fireEvent.changeText(textField(), text);
const typeOption = (number: number, text: string) =>
  fireEvent.changeText(optionField(number), text);
const chooseFormat = (format: keyof typeof questionFormatNames) =>
  fireEvent.press(screen.getByRole('button', { name: questionFormatNames[format] }));
const removeButton = (number: number) =>
  screen.getByRole('button', { name: fillCopy(message.removeOptionLabel, { number }) });

// Saving finishes after the press, so the test waits for it to settle.
async function pressSave() {
  fireEvent.press(saveButton());
  await act(async () => {});
}

describe('QuestionEditorScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  describe('the screen', () => {
    it('should show the title as the heading', async () => {
      await renderEditor();

      expect(screen.getByRole('header', { name: message.titleNew })).toBeOnTheScreen();
    });

    it('should go back from the back button', async () => {
      await renderEditor();

      fireEvent.press(screen.getByRole('button', { name: message.backLabel }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should fall back to the list when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderEditor();

      fireEvent.press(screen.getByRole('button', { name: message.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith('/games/questions/my-questions');
    });

    it('should move its content out of the way of the keyboard, with Save inside it', async () => {
      await renderEditor();

      const avoidingView = screen.UNSAFE_getByType(KeyboardAvoidingView);
      expect(within(avoidingView).getByRole('button', { name: message.save })).toBeOnTheScreen();
    });
  });

  describe('a new question', () => {
    it('should start on the first format, the first category and the first topic', async () => {
      await renderEditor();

      expect(
        screen.getByRole('button', { name: questionFormatNames.ifYou, selected: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: categoryNames.c1, selected: true }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: topicNames.t1, selected: true })).toBeOnTheScreen();
    });

    it('should offer the four formats a player can write, and not secret match', async () => {
      await renderEditor();

      for (const format of ['ifYou', 'neverHave', 'eitherOr', 'guess'] as const) {
        expect(screen.getByRole('button', { name: questionFormatNames[format] })).toBeOnTheScreen();
      }
      expect(
        screen.queryByRole('button', { name: questionFormatNames.secretMatch }),
      ).not.toBeOnTheScreen();
    });

    it('should offer all four categories and all six topics', async () => {
      await renderEditor();

      for (const name of [...Object.values(categoryNames), ...Object.values(topicNames)]) {
        expect(screen.getByRole('button', { name })).toBeOnTheScreen();
      }
    });

    it('should choose a category and a topic when their chips are pressed, and only those', async () => {
      await renderEditor();

      fireEvent.press(screen.getByRole('button', { name: categoryNames.c3 }));
      fireEvent.press(screen.getByRole('button', { name: topicNames.t5 }));

      expect(
        screen.getByRole('button', { name: categoryNames.c3, selected: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: categoryNames.c1, selected: false }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: topicNames.t5, selected: true })).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: topicNames.t1, selected: false }),
      ).toBeOnTheScreen();
    });

    it('should have a multiline field with a count against 140 characters', async () => {
      await renderEditor();

      expect(textField()).toHaveProp('multiline', true);
      expect(screen.getByText('0/140', { includeHiddenElements: true })).toBeOnTheScreen();
    });

    it('should not stop typing at 140 characters, so the message can show', async () => {
      await renderEditor();

      expect(textField()).not.toHaveProp('maxLength', expect.anything());
    });

    it('should count the tidied text', async () => {
      await renderEditor();

      typeText('  Placeholder    question  ');

      expect(screen.getByText('20/140', { includeHiddenElements: true })).toBeOnTheScreen();
    });

    it('should have no delete button', async () => {
      await renderEditor();

      expect(screen.queryByRole('button', { name: message.delete })).not.toBeOnTheScreen();
    });

    it('should switch Save off while the text is empty, and on once something is written', async () => {
      await renderEditor();

      expect(screen.getByRole('button', { name: message.save, disabled: true })).toBeOnTheScreen();

      typeText('Placeholder question 1');

      expect(screen.getByRole('button', { name: message.save, disabled: false })).toBeOnTheScreen();
    });

    it.each([
      ['ifYou', questionFormatNames.ifYou],
      ['neverHave', questionFormatNames.neverHave],
      ['eitherOr', questionFormatNames.eitherOr],
    ] as const)('should show the lead before the field for %s', async (format, lead) => {
      await renderEditor();

      chooseFormat(format);

      expect(screen.getByText(fillCopy(message.leadBefore, { lead }))).toBeOnTheScreen();
    });

    it('should show no lead before the field for guess your partner', async () => {
      await renderEditor();

      chooseFormat('guess');

      expect(screen.queryByText(/\.\.\.$/)).not.toBeOnTheScreen();
    });
  });

  describe('the format', () => {
    it('should show no options for Drink if and Never have I ever', async () => {
      await renderEditor();

      expect(screen.queryByLabelText(fillCopy(message.optionLabel, { number: 1 }))).toBeNull();
      chooseFormat('neverHave');
      expect(screen.queryByLabelText(fillCopy(message.optionLabel, { number: 1 }))).toBeNull();
    });

    it('should keep the text when the format changes', async () => {
      await renderEditor();
      typeText('Placeholder question 1');

      chooseFormat('neverHave');
      chooseFormat('guess');

      expect(textField()).toHaveDisplayValue('Placeholder question 1');
    });

    it('should drop the options when the format changes to one without them', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      chooseFormat('eitherOr');
      typeOption(1, 'Option a');
      typeOption(2, 'Option b');

      chooseFormat('ifYou');
      chooseFormat('eitherOr');

      expect(optionField(1)).toHaveDisplayValue('');
      expect(optionField(2)).toHaveDisplayValue('');
    });

    it('should not store options for a format that has none', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      chooseFormat('guess');
      typeOption(1, 'Option a');
      typeOption(2, 'Option b');
      chooseFormat('neverHave');
      typeText('Placeholder question 1');

      await pressSave();

      expect(await fixture.repository.listPlayerQuestions()).toEqual([
        expect.not.objectContaining({ options: expect.anything() }),
      ]);
    });

    it('should keep the first two options when guess changes to would you rather', async () => {
      await renderEditor();
      chooseFormat('guess');
      typeOption(1, 'Option a');
      typeOption(2, 'Option b');
      fireEvent.press(screen.getByRole('button', { name: message.addOption }));
      typeOption(3, 'Option c');

      chooseFormat('eitherOr');

      expect(optionField(1)).toHaveDisplayValue('Option a');
      expect(optionField(2)).toHaveDisplayValue('Option b');
      expect(screen.queryByLabelText(fillCopy(message.optionLabel, { number: 3 }))).toBeNull();
    });

    it('should clear the messages when the format changes', async () => {
      await renderEditor();
      typeText('   ');
      await pressSave();

      chooseFormat('neverHave');

      expect(
        screen.queryByText(message.errorEmpty, { includeHiddenElements: true }),
      ).not.toBeOnTheScreen();
    });
  });

  describe('would you rather', () => {
    it('should show two option fields with no remove and no add', async () => {
      await renderEditor();

      chooseFormat('eitherOr');

      expect(optionField(1)).toBeOnTheScreen();
      expect(optionField(2)).toBeOnTheScreen();
      expect(screen.queryByLabelText(fillCopy(message.optionLabel, { number: 3 }))).toBeNull();
      expect(screen.queryByRole('button', { name: message.addOption })).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: fillCopy(message.removeOptionLabel, { number: 1 }) }),
      ).not.toBeOnTheScreen();
    });

    it('should make the text optional', async () => {
      await renderEditor();

      chooseFormat('eitherOr');

      expect(screen.getByLabelText(message.textLabelOptional)).toHaveProp(
        'placeholder',
        message.textPlaceholderOptional,
      );
    });

    it('should switch Save off until both options are filled in, with no text', async () => {
      await renderEditor();
      chooseFormat('eitherOr');
      typeOption(1, 'Option a');

      expect(screen.getByRole('button', { name: message.save, disabled: true })).toBeOnTheScreen();

      typeOption(2, 'Option b');

      expect(screen.getByRole('button', { name: message.save, disabled: false })).toBeOnTheScreen();
    });

    it('should store the options with no text', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      chooseFormat('eitherOr');
      typeOption(1, 'Option a');
      typeOption(2, 'Option b');

      await pressSave();

      const [stored] = await fixture.repository.listPlayerQuestions();
      expect(stored).toEqual(
        expect.objectContaining({
          format: 'eitherOr',
          options: [
            { id: 'o1', text: 'Option a' },
            { id: 'o2', text: 'Option b' },
          ],
        }),
      );
      expect(stored).not.toHaveProperty('text');
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('guess your partner', () => {
    it('should start with two options, the hint, and add but no remove', async () => {
      await renderEditor();

      chooseFormat('guess');

      expect(optionField(1)).toBeOnTheScreen();
      expect(optionField(2)).toBeOnTheScreen();
      expect(screen.getByText(message.guessHint)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: message.addOption })).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: fillCopy(message.removeOptionLabel, { number: 1 }) }),
      ).not.toBeOnTheScreen();
    });

    it('should add options up to four, then hide Add', async () => {
      await renderEditor();
      chooseFormat('guess');

      fireEvent.press(screen.getByRole('button', { name: message.addOption }));
      fireEvent.press(screen.getByRole('button', { name: message.addOption }));

      expect(optionField(4)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: message.addOption })).not.toBeOnTheScreen();
    });

    it('should remove the option that is named, and keep the others in order', async () => {
      await renderEditor();
      chooseFormat('guess');
      fireEvent.press(screen.getByRole('button', { name: message.addOption }));
      typeOption(1, 'Option a');
      typeOption(2, 'Option b');
      typeOption(3, 'Option c');

      fireEvent.press(removeButton(2));

      expect(optionField(1)).toHaveDisplayValue('Option a');
      expect(optionField(2)).toHaveDisplayValue('Option c');
      expect(screen.queryByLabelText(fillCopy(message.optionLabel, { number: 3 }))).toBeNull();
    });

    it('should hide Remove again at two options', async () => {
      await renderEditor();
      chooseFormat('guess');
      fireEvent.press(screen.getByRole('button', { name: message.addOption }));

      fireEvent.press(removeButton(3));

      expect(
        screen.queryByRole('button', { name: fillCopy(message.removeOptionLabel, { number: 1 }) }),
      ).not.toBeOnTheScreen();
    });

    it('should switch Save off while an option is empty', async () => {
      await renderEditor();
      chooseFormat('guess');
      typeText('Placeholder question 1');
      typeOption(1, 'Option a');

      expect(screen.getByRole('button', { name: message.save, disabled: true })).toBeOnTheScreen();
    });

    it('should store the question and its options in order', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      chooseFormat('guess');
      fireEvent.press(screen.getByRole('button', { name: message.addOption }));
      typeText('Placeholder question 1');
      typeOption(1, 'Option a');
      typeOption(2, 'Option b');
      typeOption(3, 'Option c');

      await pressSave();

      expect(await fixture.repository.listPlayerQuestions()).toEqual([
        expect.objectContaining({
          format: 'guess',
          text: 'Placeholder question 1',
          options: [
            { id: 'o1', text: 'Option a' },
            { id: 'o2', text: 'Option b' },
            { id: 'o3', text: 'Option c' },
          ],
        }),
      ]);
    });
  });

  describe('saving a new question', () => {
    it('should store it with its format, category and topic, then go back', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      chooseFormat('neverHave');
      fireEvent.press(screen.getByRole('button', { name: categoryNames.c4 }));
      fireEvent.press(screen.getByRole('button', { name: topicNames.t6 }));
      typeText('  Placeholder \n  question   1 ');

      await pressSave();

      expect(await fixture.repository.listPlayerQuestions()).toEqual([
        expect.objectContaining({
          format: 'neverHave',
          category: 'c4',
          topic: 't6',
          text: 'Placeholder question 1',
        }),
      ]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should save once when Save is pressed twice at once', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      typeText('Placeholder question 1');
      const savePlayerQuestion = jest.spyOn(fixture.repository, 'savePlayerQuestion');

      fireEvent.press(saveButton());
      fireEvent.press(saveButton());
      await act(async () => {});

      expect(savePlayerQuestion).toHaveBeenCalledTimes(1);
    });

    it('should say the limit was reached when 300 questions are held, and store nothing more', async () => {
      const fixture = makeOwnQuestionsFixture();
      for (let number = 1; number <= limits.playerQuestions; number += 1) {
        await addQuestion(fixture, { text: `Placeholder question ${number}` });
      }
      await renderEditor(fixture);
      typeText('One more');

      await pressSave();

      expect(screen.getByText(message.limit, { includeHiddenElements: true })).toBeOnTheScreen();
      expect(await fixture.repository.listPlayerQuestions()).toHaveLength(limits.playerQuestions);
    });

    it('should say the save failed when the store throws, and allow another try', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      typeText('Placeholder question 1');
      jest.spyOn(fixture.repository, 'savePlayerQuestion').mockRejectedValueOnce(new Error('disk'));

      await pressSave();
      expect(
        screen.getByText(message.writeFailed, { includeHiddenElements: true }),
      ).toBeOnTheScreen();

      await pressSave();
      expect(await fixture.repository.listPlayerQuestions()).toHaveLength(1);
    });
  });

  describe('a question that cannot be saved', () => {
    it('should say to write one first when the text is only spaces, and store nothing', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      typeText('   ');

      await pressSave();

      expect(textField()).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorEmpty),
      );
      expect(await fixture.repository.listPlayerQuestions()).toEqual([]);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should say it is too long when it is over 140 characters, and keep the count', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      typeText('x'.repeat(limits.cardTextLength + 1));

      await pressSave();

      expect(textField()).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorTooLong),
      );
      expect(screen.getByText('141/140', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(await fixture.repository.listPlayerQuestions()).toEqual([]);
    });

    it('should accept a question of exactly 140 characters', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      typeText('x'.repeat(limits.cardTextLength));

      await pressSave();

      expect(await fixture.repository.listPlayerQuestions()).toHaveLength(1);
    });

    it('should say it is already written when it repeats one of their questions', async () => {
      const fixture = makeOwnQuestionsFixture();
      await addQuestion(fixture);
      await renderEditor(fixture);
      typeText('placeholder   QUESTION 1');

      await pressSave();

      expect(textField()).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorDuplicate),
      );
      expect(await fixture.repository.listPlayerQuestions()).toHaveLength(1);
    });

    it('should say it is already written when it repeats a shipped question', async () => {
      const fixture = makeOwnQuestionsFixture({ shippedTexts: ['Shipped question 1'] });
      await renderEditor(fixture);
      typeText('shipped question 1');

      await pressSave();

      expect(textField()).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorDuplicate),
      );
    });

    it('should clear the message when the text is changed', async () => {
      await renderEditor();
      typeText('   ');
      await pressSave();

      typeText('Placeholder question 1');

      expect(textField()).not.toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorEmpty),
      );
    });

    it('should announce the message', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await renderEditor();
      typeText('   ');

      await pressSave();

      expect(announce).toHaveBeenCalledWith(message.errorEmpty);
    });

    it('should show a repeated option under the second of the two that match, and store nothing', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderEditor(fixture);
      chooseFormat('guess');
      typeText('Placeholder question 1');
      fireEvent.press(screen.getByRole('button', { name: message.addOption }));
      typeOption(1, 'Answer one');
      typeOption(2, 'answer   ONE');
      typeOption(3, 'Answer three');

      await pressSave();

      expect(optionField(2)).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorOptionRepeat),
      );
      expect(optionField(1)).not.toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorOptionRepeat),
      );
      expect(optionField(3)).not.toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorOptionRepeat),
      );
      expect(textField()).not.toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorDuplicate),
      );
      expect(await fixture.repository.listPlayerQuestions()).toEqual([]);
    });

    it('should show an option of only spaces as needing filling in, under that option', async () => {
      await renderEditor();
      chooseFormat('eitherOr');
      typeOption(1, 'Option a');
      typeOption(2, '   ');

      await pressSave();

      expect(optionField(2)).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorOptionEmpty),
      );
      expect(optionField(1)).not.toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorOptionEmpty),
      );
    });

    it('should show an option that is too long under that option, with its own count', async () => {
      await renderEditor();
      chooseFormat('eitherOr');
      typeOption(1, 'Option a');
      typeOption(2, 'x'.repeat(limits.cardTextLength + 1));

      await pressSave();

      expect(optionField(2)).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorTooLong),
      );
      expect(screen.getByText('141/140', { includeHiddenElements: true })).toBeOnTheScreen();
    });

    it('should show a problem in the text and one in an option together, each under its field', async () => {
      await renderEditor();
      chooseFormat('guess');
      typeText('   ');
      typeOption(1, 'Option a');
      typeOption(2, '   ');

      await pressSave();

      expect(textField()).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorEmpty),
      );
      expect(optionField(2)).toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorOptionEmpty),
      );
    });

    it('should clear the option messages when an option is changed', async () => {
      await renderEditor();
      chooseFormat('eitherOr');
      typeOption(1, 'Option a');
      typeOption(2, '   ');
      await pressSave();

      typeOption(2, 'Option b');

      expect(optionField(2)).not.toHaveProp(
        'accessibilityHint',
        expect.stringContaining(message.errorOptionEmpty),
      );
    });
  });

  describe('changing a stored question', () => {
    it('should open with its format, category, topic and text', async () => {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture, {
        format: 'neverHave',
        category: 'c3',
        topic: 't5',
        text: 'Placeholder question 2',
      });

      await renderEditor(fixture, stored.id);

      expect(
        screen.getByRole('button', { name: questionFormatNames.neverHave, selected: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: categoryNames.c3, selected: true }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: topicNames.t5, selected: true })).toBeOnTheScreen();
      expect(textField()).toHaveDisplayValue('Placeholder question 2');
    });

    it('should open a would you rather question with its options and no text', async () => {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture, {
        format: 'eitherOr',
        text: '',
        options: ['Option a', 'Option b'],
      });

      await renderEditor(fixture, stored.id);

      expect(screen.getByLabelText(message.textLabelOptional)).toHaveDisplayValue('');
      expect(optionField(1)).toHaveDisplayValue('Option a');
      expect(optionField(2)).toHaveDisplayValue('Option b');
    });

    it('should change the stored question, not add another, then go back', async () => {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture, {
        format: 'guess',
        options: ['Option a', 'Option b', 'Option c'],
      });
      await renderEditor(fixture, stored.id);
      typeText('Placeholder question 2');
      typeOption(2, 'Option x');

      await pressSave();

      expect(await fixture.repository.listPlayerQuestions()).toEqual([
        expect.objectContaining({
          id: stored.id,
          text: 'Placeholder question 2',
          options: [
            { id: 'o1', text: 'Option a' },
            { id: 'o2', text: 'Option x' },
            { id: 'o3', text: 'Option c' },
          ],
        }),
      ]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should let a question be saved again with its own text', async () => {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture);
      await renderEditor(fixture, stored.id);

      await pressSave();

      expect(await fixture.repository.listPlayerQuestions()).toHaveLength(1);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should go to the list when the id matches no question', async () => {
      const fixture = makeOwnQuestionsFixture();
      await renderThemed(
        <fixture.Providers>
          <QuestionEditorScreen questionId="pq-missing" />
        </fixture.Providers>,
      );

      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith('/games/questions/my-questions'),
      );
    });
  });

  describe('a change that removes discoveries', () => {
    async function openGuessWithDiscovery() {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture, {
        format: 'guess',
        options: ['Option a', 'Option b', 'Option c'],
      });
      await fixture.repository.addDiscoveries([
        { kind: 'agree', questionId: stored.id, optionId: 'o1' },
      ]);
      await renderEditor(fixture, stored.id);
      return { fixture, stored };
    }
    const dialog = () => screen.getByLabelText(message.saveChangeTitle);

    it('should ask first when an option is removed, and save nothing yet', async () => {
      const { fixture } = await openGuessWithDiscovery();
      fireEvent.press(removeButton(3));

      await pressSave();

      expect(within(dialog()).getByText(message.saveChangeBody)).toBeOnTheScreen();
      expect(await fixture.repository.listPlayerQuestions()).toEqual([
        expect.objectContaining({
          options: expect.arrayContaining([{ id: 'o3', text: 'Option c' }]),
        }),
      ]);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should ask first when the format changes', async () => {
      await openGuessWithDiscovery();
      chooseFormat('neverHave');

      await pressSave();

      expect(dialog()).toBeOnTheScreen();
    });

    it('should keep the question and its discoveries when cancelled, and keep editing', async () => {
      const { fixture } = await openGuessWithDiscovery();
      fireEvent.press(removeButton(3));
      await pressSave();

      fireEvent.press(within(dialog()).getByRole('button', { name: message.saveChangeCancel }));
      await act(async () => {});

      expect(await fixture.repository.listDiscoveries()).toHaveLength(1);
      expect(await fixture.repository.listPlayerQuestions()).toEqual([
        expect.objectContaining({
          options: expect.arrayContaining([{ id: 'o3', text: 'Option c' }]),
        }),
      ]);
      expect(mockBack).not.toHaveBeenCalled();
      expect(optionField(2)).toBeOnTheScreen();
    });

    it('should save the change and delete the discoveries when confirmed', async () => {
      const { fixture } = await openGuessWithDiscovery();
      fireEvent.press(removeButton(3));
      await pressSave();

      fireEvent.press(within(dialog()).getByRole('button', { name: message.saveChangeConfirm }));
      await act(async () => {});

      expect(await fixture.repository.listDiscoveries()).toEqual([]);
      expect(await fixture.repository.listPlayerQuestions()).toEqual([
        expect.objectContaining({
          options: [
            { id: 'o1', text: 'Option a' },
            { id: 'o2', text: 'Option b' },
          ],
        }),
      ]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should save a reword without asking, and keep the discoveries', async () => {
      const { fixture } = await openGuessWithDiscovery();
      typeText('Placeholder question 2');
      typeOption(1, 'Option x');

      await pressSave();

      expect(screen.queryByLabelText(message.saveChangeTitle)).not.toBeOnTheScreen();
      expect(await fixture.repository.listDiscoveries()).toHaveLength(1);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleting', () => {
    async function openDeleteDialog(fixture: Fixture, questionId: string) {
      await renderEditor(fixture, questionId);
      fireEvent.press(screen.getByRole('button', { name: message.delete }));
      return screen.getByLabelText(message.deleteTitle);
    }

    it('should ask first, naming the discoveries that go with it', async () => {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture);

      const dialog = await openDeleteDialog(fixture, stored.id);

      expect(within(dialog).getByText(message.deleteBody)).toBeOnTheScreen();
      expect(await fixture.repository.listPlayerQuestions()).toHaveLength(1);
    });

    it('should keep the question when it is cancelled', async () => {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture);
      const dialog = await openDeleteDialog(fixture, stored.id);

      fireEvent.press(within(dialog).getByRole('button', { name: message.deleteCancel }));

      expect(await fixture.repository.listPlayerQuestions()).toHaveLength(1);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should delete the question and its discoveries, then go back', async () => {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture, {
        format: 'eitherOr',
        text: '',
        options: ['Option a', 'Option b'],
      });
      await fixture.repository.addDiscoveries([
        { kind: 'agree', questionId: stored.id, optionId: 'o1' },
      ]);
      const dialog = await openDeleteDialog(fixture, stored.id);
      // The repository deletes the discoveries with the question, so the screen must go through it.
      const deletePlayerQuestion = jest.spyOn(fixture.repository, 'deletePlayerQuestion');

      fireEvent.press(within(dialog).getByRole('button', { name: message.deleteConfirm }));
      await act(async () => {});

      expect(deletePlayerQuestion).toHaveBeenCalledWith(stored.id);
      expect(await fixture.repository.listPlayerQuestions()).toEqual([]);
      expect(await fixture.repository.listDiscoveries()).toEqual([]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should say the write failed when the delete throws, and stay', async () => {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture);
      const dialog = await openDeleteDialog(fixture, stored.id);
      jest.spyOn(fixture.repository, 'deletePlayerQuestion').mockRejectedValue(new Error('disk'));

      fireEvent.press(within(dialog).getByRole('button', { name: message.deleteConfirm }));
      await act(async () => {});

      expect(
        screen.getByText(message.writeFailed, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
});
