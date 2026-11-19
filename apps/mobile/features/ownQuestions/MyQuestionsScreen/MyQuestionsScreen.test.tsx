import { categoryNames, copy, fillCopy, questionFormatNames, topicNames } from '@getfreak/content';
import { limits } from '@getfreak/core';
import { waitFor } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';

import { drawnCharacters } from '../../../testing/drawnCharacters';
import type { QuestionDraft } from '../../../storage';
import { renderThemed } from '../../../tailwind/renderThemed';
import { makeOwnQuestionsFixture } from '../testing/ownQuestionsFixture';
import { MyQuestionsScreen } from './MyQuestionsScreen';

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

async function renderList(fixture: Fixture = makeOwnQuestionsFixture()) {
  await renderThemed(
    <fixture.Providers>
      <MyQuestionsScreen />
    </fixture.Providers>,
  );
  await waitFor(() => expect(screen.getByRole('button', { name: message.add })).toBeOnTheScreen());
}

describe('MyQuestionsScreen', () => {
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

      expect(screen.getByRole('header', { name: message.title })).toBeOnTheScreen();
    });

    it('should go back from the back button', async () => {
      await renderList();

      fireEvent.press(screen.getByRole('button', { name: message.backLabel }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should fall back to the Drink If home when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderList();

      fireEvent.press(screen.getByRole('button', { name: message.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith('/games/questions');
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('with no questions', () => {
    it('should invite the first question, with Theo sly beside it as a picture screen readers skip', async () => {
      await renderList();

      expect(screen.getByText(message.emptyTheo)).toBeOnTheScreen();
      expect(screen.getByText(message.empty)).toBeOnTheScreen();
      expect(drawnCharacters()).toEqual([
        {
          props: { character: 'shy', mood: 'flirty', size: 'hero' },
          isHiddenFromScreenReaders: true,
        },
      ]);
    });

    it('should show no count line', async () => {
      await renderList();

      expect(screen.queryByText(fillCopy(message.countLine, { count: 0 }))).not.toBeOnTheScreen();
    });

    it('should open a new question from the add button', async () => {
      await renderList();

      fireEvent.press(screen.getByRole('button', { name: message.add }));

      expect(mockPush).toHaveBeenCalledWith('/games/questions/my-questions/new');
    });
  });

  describe('with questions', () => {
    it('should show how many are written', async () => {
      const fixture = makeOwnQuestionsFixture();
      await addQuestion(fixture, { text: 'Placeholder question 1' });
      await addQuestion(fixture, { text: 'Placeholder question 2' });

      await renderList(fixture);

      expect(screen.getByText(fillCopy(message.countLine, { count: 2 }))).toBeOnTheScreen();
      expect(screen.queryByText(message.empty)).not.toBeOnTheScreen();
    });

    it('should group by format in the order of the editor, with a heading for each', async () => {
      const fixture = makeOwnQuestionsFixture();
      await addQuestion(fixture, {
        format: 'guess',
        text: 'Placeholder guess',
        options: ['A', 'B'],
      });
      await addQuestion(fixture, { format: 'neverHave', text: 'Placeholder never' });
      await addQuestion(fixture, { format: 'ifYou', text: 'Placeholder drink' });

      await renderList(fixture);

      const headings = screen.getAllByRole('header').map((heading) => heading.props.children);
      expect(headings).toEqual([
        message.title,
        questionFormatNames.ifYou,
        questionFormatNames.neverHave,
        questionFormatNames.guess,
      ]);
    });

    it('should leave out the heading of a format with no questions', async () => {
      const fixture = makeOwnQuestionsFixture();
      await addQuestion(fixture);

      await renderList(fixture);

      expect(
        screen.queryByRole('header', { name: questionFormatNames.eitherOr }),
      ).not.toBeOnTheScreen();
    });

    it('should list the questions of a format by category in rank order, whatever order they were written', async () => {
      const fixture = makeOwnQuestionsFixture();
      await addQuestion(fixture, { category: 'c3', text: 'Placeholder third' });
      await addQuestion(fixture, { category: 'c1', text: 'Placeholder first' });
      await addQuestion(fixture, { category: 'c2', text: 'Placeholder second' });

      await renderList(fixture);

      const names = screen
        .getAllByRole('button', { name: /^Drink if Placeholder/ })
        .map((row) => row.props.accessibilityLabel);
      expect(names).toEqual([
        'Drink if Placeholder first',
        'Drink if Placeholder second',
        'Drink if Placeholder third',
      ]);
    });

    it('should show the lead before the text of each format that has one, and none for guess', async () => {
      const fixture = makeOwnQuestionsFixture();
      await addQuestion(fixture, { format: 'ifYou', text: 'Placeholder drink' });
      await addQuestion(fixture, { format: 'neverHave', text: 'Placeholder never' });
      await addQuestion(fixture, {
        format: 'guess',
        text: 'Placeholder guess',
        options: ['A', 'B'],
      });

      await renderList(fixture);

      expect(
        screen.getByRole('button', { name: `${copy.questionLeads.ifYou} Placeholder drink` }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: `${copy.questionLeads.neverHave} Placeholder never` }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Placeholder guess' })).toBeOnTheScreen();
    });

    it('should show a would you rather question with its two options, and its text when it has one', async () => {
      const fixture = makeOwnQuestionsFixture();
      await addQuestion(fixture, {
        format: 'eitherOr',
        text: '',
        options: ['Option a', 'Option b'],
      });
      await addQuestion(fixture, {
        format: 'eitherOr',
        text: 'Placeholder framing',
        options: ['Option c', 'Option d'],
      });

      await renderList(fixture);

      expect(
        screen.getByRole('button', {
          name: `${copy.questionLeads.eitherOr} ${fillCopy(message.eitherOrOptions, { first: 'Option a', second: 'Option b' })}`,
        }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', {
          name: `${copy.questionLeads.eitherOr} Placeholder framing ${fillCopy(message.eitherOrOptions, { first: 'Option c', second: 'Option d' })}`,
        }),
      ).toBeOnTheScreen();
    });

    it('should show the category and the topic of each question', async () => {
      const fixture = makeOwnQuestionsFixture();
      await addQuestion(fixture, { category: 'c4', topic: 't6' });

      await renderList(fixture);

      expect(screen.getByText(categoryNames.c4)).toBeOnTheScreen();
      expect(screen.getByText(topicNames.t6)).toBeOnTheScreen();
    });

    it('should open a question for editing when its row is pressed', async () => {
      const fixture = makeOwnQuestionsFixture();
      const stored = await addQuestion(fixture);
      await renderList(fixture);

      fireEvent.press(
        screen.getByRole('button', { name: `${copy.questionLeads.ifYou} Placeholder question 1` }),
      );

      expect(mockPush).toHaveBeenCalledWith(`/games/questions/my-questions/${stored.id}`);
    });

    it('should leave Add on below the limit, with no explanation', async () => {
      const fixture = makeOwnQuestionsFixture();
      await addQuestion(fixture);

      await renderList(fixture);

      expect(screen.getByRole('button', { name: message.add, disabled: false })).toBeOnTheScreen();
      expect(screen.queryByText(message.limit)).not.toBeOnTheScreen();
    });
  });

  describe('at the limit', () => {
    async function renderFullList() {
      const fixture = makeOwnQuestionsFixture();
      for (let number = 1; number <= limits.playerQuestions; number += 1) {
        await addQuestion(fixture, { text: `Placeholder question ${number}` });
      }
      await renderList(fixture);
    }

    it('should switch Add off and say why at 300 questions', async () => {
      await renderFullList();

      expect(screen.getByRole('button', { name: message.add, disabled: true })).toBeOnTheScreen();
      expect(screen.getByText(message.limit)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(message.countLine, { count: limits.playerQuestions })),
      ).toBeOnTheScreen();
    });

    it('should open nothing when the disabled Add is pressed', async () => {
      await renderFullList();

      fireEvent.press(screen.getByRole('button', { name: message.add }));

      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
