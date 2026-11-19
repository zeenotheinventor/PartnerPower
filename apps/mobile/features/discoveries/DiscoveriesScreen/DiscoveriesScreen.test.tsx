import { copy, fillCopy, topicNames } from '@getfreak/content';
import {
  questionPreferencesSchema,
  topicIds,
  type NewDiscovery,
  type Question,
  type QuestionDeck,
} from '@getfreak/core';
import { waitFor } from '@testing-library/react-native';
import { act, fireEvent, screen, within } from 'nativewind/test';

import { PersonalDataProvider } from '../../../personal';
import type { PersonalDataSource } from '../../../personal';
import { storage } from '../../../storage';
import type { PersonalRepository } from '../../../storage';
import { createInMemoryPersonalRepository } from '../../../storage/personal/createInMemoryPersonalRepository';
import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { DiscoveriesScreen } from './DiscoveriesScreen';

// The default storage runs over an in-memory backend, so a test can set the saving switch.
jest.mock('expo-sqlite/kv-store', () => {
  const { createInMemoryBackend } = jest.requireActual<
    typeof import('../../../storage/createInMemoryBackend')
  >('../../../storage/createInMemoryBackend');
  return { __esModule: true, default: createInMemoryBackend() };
});

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

// The shipped questions are placeholders, so the tests hold no question content. The array is read
// when it is used, because this factory runs before the array below exists.
const mockQuestionDecks: QuestionDeck[] = [];
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return Object.defineProperty({ ...actual }, 'questionDecks', {
    get: () => mockQuestionDecks,
    enumerable: true,
  });
});

const perFormat = 100;
const numbers = Array.from({ length: perFormat }, (_, index) => index + 1);
const pad = (number: number) => String(number).padStart(3, '0');
const topicOf = (number: number) => topicIds[number % topicIds.length] ?? 't1';
const options = [
  { id: 'a', text: 'Option A' },
  { id: 'b', text: 'Option B' },
];

const secretItems: Question[] = numbers.map((number) => ({
  id: `m-${pad(number)}`,
  format: 'secretMatch',
  category: 'c1',
  topic: topicOf(number),
  source: 'shipped',
  text: `Item ${pad(number)}`,
  tags: [],
}));
const eitherOrQuestions: Question[] = numbers.map((number) => ({
  id: `e-${pad(number)}`,
  format: 'eitherOr',
  category: 'c1',
  topic: topicOf(number),
  source: 'shipped',
  options,
}));
const guessQuestions: Question[] = numbers.map((number) => ({
  id: `g-${pad(number)}`,
  format: 'guess',
  category: 'c2',
  topic: topicOf(number),
  source: 'shipped',
  text: `Guess ${pad(number)}`,
  options,
}));

mockQuestionDecks.push(
  { id: 'secretMatch', version: 1, questions: secretItems },
  { id: 'eitherOr', version: 1, questions: eitherOrQuestions },
  { id: 'guess', version: 1, questions: guessQuestions },
);

function makeRepository(): PersonalRepository {
  return createInMemoryPersonalRepository({
    getShippedCards: () => [],
    getShippedQuestions: () =>
      mockQuestionDecks
        .flatMap((deck) => deck.questions)
        .map((question) => ({
          id: question.id,
          optionIds: 'options' in question ? question.options.map((option) => option.id) : [],
        })),
    randomUUID: () => '00000000-0000-4000-8000-000000000001',
    now: () => 1,
  });
}

// A few hundred discoveries, oldest first: 100 matches, 100 agreed options, 100 answers split
// between two players, and 20 about questions that are not there now.
const missingCount = 20;
const realisticDiscoveries: NewDiscovery[] = [
  ...numbers.map((number): NewDiscovery => ({
    kind: 'match',
    questionId: `m-${pad(number)}`,
    strength: number % 2 === 0 ? 'yes' : 'maybe',
  })),
  ...numbers.map((number): NewDiscovery => ({
    kind: 'agree',
    questionId: `e-${pad(number)}`,
    optionId: number % 2 === 0 ? 'a' : 'b',
  })),
  ...numbers.map((number): NewDiscovery => ({
    kind: 'answer',
    questionId: `g-${pad(number)}`,
    optionId: 'a',
    answererName: number % 2 === 0 ? 'Player A' : 'Player B',
  })),
  ...Array.from({ length: missingCount }, (_, index): NewDiscovery => ({
    kind: 'match',
    questionId: `gone-${index}`,
    strength: 'yes',
  })),
];
const visibleCount = realisticDiscoveries.length - missingCount;

let repository: PersonalRepository;

// The stand-in the screen reads while the store opens. It never answers, so no update arrives
// outside an act, and the screen shows only what the opened store holds.
function makePlaceholderRepository(): PersonalRepository {
  return {
    ...makeRepository(),
    listDiscoveries: () => new Promise<never>(() => {}),
    listPlayerQuestions: () => new Promise<never>(() => {}),
  };
}

// Renders the screen with the store still closed, then opens it inside an act, so nothing updates
// outside one.
async function renderWithStore(store: PersonalRepository) {
  repository = store;
  let open: (opened: PersonalRepository) => void = () => {};
  const source: PersonalDataSource = {
    load: () => new Promise<PersonalRepository>((resolve) => (open = resolve)),
    createEmpty: makePlaceholderRepository,
  };
  const view = await renderThemed(
    <PersonalDataProvider source={source}>
      <DiscoveriesScreen />
    </PersonalDataProvider>,
  );
  // The screens read the store again once it has opened, which settles in a second act.
  const openStore = async () => {
    await act(async () => open(store));
    await act(async () => {});
  };
  return { view, openStore };
}

async function renderScreen(discoveries: readonly NewDiscovery[] = realisticDiscoveries) {
  const store = makeRepository();
  await store.addDiscoveries(discoveries);
  const { view, openStore } = await renderWithStore(store);
  await openStore();
  return view;
}

const removeButtons = () => screen.getAllByRole('button', { name: /^Remove, / });
const saveSwitch = () => screen.getByRole('switch', { name: copy.discoveries.saveToggle });
const dialog = (title: string) => within(screen.getByLabelText(title));

describe('DiscoveriesScreen', () => {
  beforeEach(async () => {
    await storage.set('questionPreferences', { saveDiscoveries: true });
  });

  afterEach(() => {
    [mockPush, mockBack, mockReplace].forEach((mock) => mock.mockClear());
    mockCanGoBack = true;
    jest.restoreAllMocks();
  });

  describe('the list', () => {
    it('should show the title, with where the discoveries are kept', async () => {
      await renderScreen();

      expect(screen.getByRole('header', { name: copy.discoveries.title })).toBeOnTheScreen();
      expect(screen.getByText(copy.discoveries.subtitle)).toBeOnTheScreen();
    });

    it('should show every discovery with a question, and none about a question that is gone', async () => {
      await renderScreen();

      expect(removeButtons()).toHaveLength(visibleCount);
      expect(await repository.listDiscoveries()).toHaveLength(visibleCount);
    });

    it('should show the three groups, with the partners grouped by name', async () => {
      await renderScreen();

      expect(screen.getByText(copy.discoveries.matchesLabel)).toBeOnTheScreen();
      expect(screen.getByText(copy.discoveries.agreeLabel)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.discoveries.aboutLabel, { name: 'Player A' })),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.discoveries.aboutLabel, { name: 'Player B' })),
      ).toBeOnTheScreen();
    });

    it('should put the newest first in each group', async () => {
      await renderScreen();

      const names = removeButtons().map((button) => button.props.accessibilityLabel);
      expect(names[0]).toBe(fillCopy(copy.discoveries.removeLabel, { text: 'Item 100' }));
      expect(names[perFormat - 1]).toBe(
        fillCopy(copy.discoveries.removeLabel, { text: 'Item 001' }),
      );
      const aboutNames = names.filter((name) => name.includes('Guess '));
      expect(aboutNames[0]).toContain('Guess 100');
      expect(aboutNames.at(-1)).toContain('Guess 001');
    });

    it('should show the topic of each entry', async () => {
      await renderScreen([{ kind: 'match', questionId: 'm-001', strength: 'yes' }]);

      expect(screen.getByText(topicNames[topicOf(1)])).toBeOnTheScreen();
    });

    it('should say how strong a match is', async () => {
      await renderScreen([
        { kind: 'match', questionId: 'm-001', strength: 'yes' },
        { kind: 'match', questionId: 'm-002', strength: 'maybe' },
      ]);

      expect(screen.getByText(copy.secretMatch.strengthYes)).toBeOnTheScreen();
      expect(screen.getByText(copy.secretMatch.strengthMaybe)).toBeOnTheScreen();
    });

    it('should show the option both picked, under the words that lead the question', async () => {
      await renderScreen([{ kind: 'agree', questionId: 'e-001', optionId: 'b' }]);

      expect(screen.getByText(copy.questionLeads.eitherOr)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.discoveries.agreeAnswer, { option: 'Option B' })),
      ).toBeOnTheScreen();
    });

    it("should show a partner's answer with their name and the question", async () => {
      await renderScreen([
        { kind: 'answer', questionId: 'g-001', optionId: 'b', answererName: 'Player A' },
      ]);

      expect(screen.getByText('Guess 001')).toBeOnTheScreen();
      expect(
        screen.getByText(
          fillCopy(copy.discoveries.aboutAnswer, { name: 'Player A', option: 'Option B' }),
        ),
      ).toBeOnTheScreen();
    });

    it('should name the remove control with the entry as it reads, so two entries differ', async () => {
      await renderScreen([
        { kind: 'agree', questionId: 'e-001', optionId: 'a' },
        { kind: 'agree', questionId: 'e-002', optionId: 'b' },
        { kind: 'answer', questionId: 'g-001', optionId: 'b', answererName: 'Player A' },
      ]);

      const removeName = (text: string) => fillCopy(copy.discoveries.removeLabel, { text });
      const agreement = (option: string) =>
        `${copy.questionLeads.eitherOr}, ${fillCopy(copy.discoveries.agreeAnswer, { option })}`;
      const answer = fillCopy(copy.discoveries.aboutAnswer, {
        name: 'Player A',
        option: 'Option B',
      });
      expect(
        screen.getByRole('button', { name: removeName(agreement('Option A')) }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: removeName(agreement('Option B')) }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: removeName(`Guess 001, ${answer}`) }),
      ).toBeOnTheScreen();
    });

    it('should show a discovery about a question the player wrote', async () => {
      const store = makeRepository();
      const saved = await store.savePlayerQuestion({
        format: 'guess',
        category: 'c3',
        topic: 't5',
        text: 'Written question',
        options: ['First', 'Second'],
      });
      if (!saved.ok) throw new Error('The question should save');
      await store.addDiscoveries([
        { kind: 'answer', questionId: saved.saved.id, optionId: 'o2', answererName: 'Player A' },
      ]);
      const { openStore } = await renderWithStore(store);
      await openStore();

      expect(screen.getByText('Written question')).toBeOnTheScreen();
      expect(
        screen.getByText(
          fillCopy(copy.discoveries.aboutAnswer, { name: 'Player A', option: 'Second' }),
        ),
      ).toBeOnTheScreen();
    });

    it('should show nothing but the title while the store opens', async () => {
      const { openStore } = await renderWithStore(makeRepository());

      expect(screen.getByRole('header', { name: copy.discoveries.title })).toBeOnTheScreen();
      expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.discoveries.emptyTitle)).not.toBeOnTheScreen();
      await openStore();
      expect(saveSwitch()).toBeOnTheScreen();
    });
  });

  describe('removing one', () => {
    it('should remove the entry, and leave every other', async () => {
      await renderScreen();
      const name = fillCopy(copy.discoveries.removeLabel, { text: 'Item 100' });

      fireEvent.press(screen.getByRole('button', { name }));

      await waitFor(() => expect(screen.queryByRole('button', { name })).not.toBeOnTheScreen());
      expect(removeButtons()).toHaveLength(visibleCount - 1);
      expect(await repository.listDiscoveries()).toHaveLength(visibleCount - 1);
    });

    it('should remove only the answer of the partner whose entry it is', async () => {
      await renderScreen([
        { kind: 'answer', questionId: 'g-001', optionId: 'a', answererName: 'Player A' },
        { kind: 'answer', questionId: 'g-001', optionId: 'b', answererName: 'Player B' },
      ]);
      const [first] = removeButtons();
      if (!first) throw new Error('There should be entries');

      fireEvent.press(first);

      await waitFor(() => expect(removeButtons()).toHaveLength(1));
      expect(await repository.listDiscoveries()).toEqual([
        expect.objectContaining({ kind: 'answer', answererName: 'Player A' }),
      ]);
    });

    it('should keep the entry and carry on when the removal fails', async () => {
      await renderScreen();
      jest.spyOn(repository, 'removeDiscovery').mockRejectedValue(new Error('no'));

      fireEvent.press(
        screen.getByRole('button', { name: removeButtons()[0]?.props.accessibilityLabel }),
      );
      await act(async () => {});

      expect(removeButtons()).toHaveLength(visibleCount);
    });
  });

  describe('Clear all', () => {
    it('should ask first, and remove nothing until it is confirmed', async () => {
      await renderScreen();

      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.clearAll }));

      expect(screen.getByLabelText(copy.discoveries.clearTitle)).toBeOnTheScreen();
      expect(screen.getByText(copy.discoveries.clearBody)).toBeOnTheScreen();
      expect(await repository.listDiscoveries()).toHaveLength(visibleCount);
    });

    it('should keep everything when the player keeps them', async () => {
      await renderScreen();
      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.clearAll }));

      fireEvent.press(
        dialog(copy.discoveries.clearTitle).getByRole('button', {
          name: copy.discoveries.clearCancel,
        }),
      );

      expect(screen.queryByLabelText(copy.discoveries.clearTitle)).not.toBeOnTheScreen();
      expect(removeButtons()).toHaveLength(visibleCount);
    });

    it('should remove everything when confirmed, and show the empty screen', async () => {
      await renderScreen();
      const clear = jest.spyOn(repository, 'clearDiscoveries');
      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.clearAll }));

      fireEvent.press(
        dialog(copy.discoveries.clearTitle).getByRole('button', {
          name: copy.discoveries.clearConfirm,
        }),
      );

      expect(await screen.findByText(copy.discoveries.emptyTitle)).toBeOnTheScreen();
      expect(clear).toHaveBeenCalledTimes(1);
      expect(screen.queryByLabelText(copy.discoveries.clearTitle)).not.toBeOnTheScreen();
    });

    it('should say it did not finish, and offer another try, when the clear fails', async () => {
      await renderScreen();
      const clear = jest
        .spyOn(repository, 'clearDiscoveries')
        .mockRejectedValueOnce(new Error('no'));
      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.clearAll }));

      fireEvent.press(
        dialog(copy.discoveries.clearTitle).getByRole('button', {
          name: copy.discoveries.clearConfirm,
        }),
      );

      expect(await screen.findByText(copy.clear.failed)).toBeOnTheScreen();
      expect(removeButtons()).toHaveLength(visibleCount);
      fireEvent.press(
        dialog(copy.discoveries.clearTitle).getByRole('button', { name: copy.clear.retry }),
      );
      expect(await screen.findByText(copy.discoveries.emptyTitle)).toBeOnTheScreen();
      expect(clear).toHaveBeenCalledTimes(2);
    });

    it('should not offer Clear all when there is nothing to clear', async () => {
      await renderScreen([]);

      expect(
        screen.queryByRole('button', { name: copy.discoveries.clearAll }),
      ).not.toBeOnTheScreen();
    });
  });

  describe('the saving switch', () => {
    it('should be on by default, and say nothing about saving', async () => {
      await renderScreen();

      expect(saveSwitch()).toBeChecked();
      expect(screen.queryByText(copy.discoveries.savingOffNotice)).not.toBeOnTheScreen();
    });

    it('should describe what is kept', async () => {
      await renderScreen();

      expect(screen.getByText(copy.discoveries.saveToggleCaption)).toBeOnTheScreen();
    });

    it('should read the stored choice, and say new discoveries are not kept when it is off', async () => {
      await storage.set('questionPreferences', { saveDiscoveries: false });

      await renderScreen();

      expect(saveSwitch()).not.toBeChecked();
      expect(screen.getByText(copy.discoveries.savingOffNotice)).toBeOnTheScreen();
    });

    it('should store the choice at once, then ask whether to clear what is saved', async () => {
      await renderScreen();

      fireEvent.press(saveSwitch());

      expect(await screen.findByLabelText(copy.discoveries.offTitle)).toBeOnTheScreen();
      expect(screen.getByText(copy.discoveries.offBody)).toBeOnTheScreen();
      await waitFor(async () =>
        expect(await storage.get('questionPreferences', questionPreferencesSchema)).toEqual({
          saveDiscoveries: false,
        }),
      );
      expect(saveSwitch()).not.toBeChecked();
      expect(screen.getByText(copy.discoveries.savingOffNotice)).toBeOnTheScreen();
    });

    it('should keep what is saved when the player keeps it', async () => {
      await renderScreen();
      fireEvent.press(saveSwitch());
      await screen.findByLabelText(copy.discoveries.offTitle);

      fireEvent.press(
        dialog(copy.discoveries.offTitle).getByRole('button', { name: copy.discoveries.offCancel }),
      );

      expect(screen.queryByLabelText(copy.discoveries.offTitle)).not.toBeOnTheScreen();
      expect(removeButtons()).toHaveLength(visibleCount);
      expect(saveSwitch()).not.toBeChecked();
    });

    it('should clear what is saved when the player clears it, and leave saving off', async () => {
      await renderScreen();
      fireEvent.press(saveSwitch());
      await screen.findByLabelText(copy.discoveries.offTitle);

      fireEvent.press(
        dialog(copy.discoveries.offTitle).getByRole('button', {
          name: copy.discoveries.offConfirm,
        }),
      );

      expect(await screen.findByText(copy.discoveries.emptyTitle)).toBeOnTheScreen();
      expect(saveSwitch()).not.toBeChecked();
    });

    it('should not ask when there is nothing saved to clear', async () => {
      await renderScreen([]);

      fireEvent.press(saveSwitch());
      await act(async () => {});

      expect(screen.queryByLabelText(copy.discoveries.offTitle)).not.toBeOnTheScreen();
      expect(saveSwitch()).not.toBeChecked();
    });

    it('should turn saving back on without asking', async () => {
      await storage.set('questionPreferences', { saveDiscoveries: false });
      await renderScreen();

      fireEvent.press(saveSwitch());
      await act(async () => {});

      expect(saveSwitch()).toBeChecked();
      expect(screen.queryByLabelText(copy.discoveries.offTitle)).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.discoveries.savingOffNotice)).not.toBeOnTheScreen();
    });
  });

  describe('when there is nothing saved', () => {
    it('should show the empty screen, with the saving switch still there', async () => {
      await renderScreen([]);

      expect(screen.getByText(copy.discoveries.emptyTheo)).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: copy.discoveries.emptyTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.discoveries.emptyBody)).toBeOnTheScreen();
      expect(saveSwitch()).toBeOnTheScreen();
    });

    it('should show the empty screen when every discovery is about a question that is gone', async () => {
      await renderScreen([{ kind: 'match', questionId: 'gone-1', strength: 'yes' }]);

      expect(screen.getByText(copy.discoveries.emptyTitle)).toBeOnTheScreen();
    });

    it('should show Theo at rest, as a picture the screen readers skip', async () => {
      await renderScreen([]);

      expect(drawnCharacters()).toEqual([
        {
          props: { character: 'shy', mood: 'idle', size: 'hero' },
          isHiddenFromScreenReaders: true,
        },
      ]);
    });

    it('should start a round from Play a round', async () => {
      await renderScreen([]);

      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.emptyPlay }));

      expect(mockPush).toHaveBeenCalledWith('/games/questions/setup');
    });

    it('should start a secret match from Secret match', async () => {
      await renderScreen([]);

      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.emptyMatch }));

      expect(mockPush).toHaveBeenCalledWith('/games/questions/match');
    });

    it('should say new discoveries are not kept when saving is off', async () => {
      await storage.set('questionPreferences', { saveDiscoveries: false });

      await renderScreen([]);

      expect(screen.getByText(copy.discoveries.savingOffNotice)).toBeOnTheScreen();
    });
  });

  describe('leaving', () => {
    it('should go back with the back button', async () => {
      await renderScreen();

      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.backLabel }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should fall back to the Drink If home when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderScreen();

      fireEvent.press(screen.getByRole('button', { name: copy.discoveries.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith('/games/questions');
    });
  });
});
