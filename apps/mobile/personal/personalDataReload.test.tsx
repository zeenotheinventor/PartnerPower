import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createInMemoryBackend } from '../storage/createInMemoryBackend';
import { createStorage } from '../storage/createStorage';
import { usePersonalData } from './PersonalDataProvider';
import { makeInMemoryRepository, makeProviderWrapper } from './testing/personalDataWrapper';
import { useCustomQuestions } from './useCustomQuestions';
import { useDiscoveries } from './useDiscoveries';

// The repository the provider holds is replaced on `reload()`, which clear everything calls. The
// hooks must read again from the new one and must stop writing to the old one.
function makeReloadingSource() {
  const first = makeInMemoryRepository();
  const second = makeInMemoryRepository();
  let loadCount = 0;
  const source = {
    load: () => Promise.resolve(loadCount++ === 0 ? first : second),
    createEmpty: makeInMemoryRepository,
  };
  return { first, second, wrapper: makeProviderWrapper(source) };
}

const questionDraft = { format: 'ifYou', category: 'c1', topic: 't1', text: 'Question 1' } as const;

describe('the hooks after the personal data is reloaded', () => {
  it('should read the discoveries again from the new repository, and write only to it', async () => {
    const { first, second, wrapper } = makeReloadingSource();
    await first.addDiscoveries([{ kind: 'match', questionId: 'q-match-01', strength: 'yes' }]);
    await second.addDiscoveries([{ kind: 'agree', questionId: 'q-either-01', optionId: 'o1' }]);
    const storage = createStorage(createInMemoryBackend());
    const { result } = renderHook(
      () => ({ personal: usePersonalData(), discoveries: useDiscoveries(storage) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.discoveries.isLoading).toBe(false));
    expect(result.current.discoveries.discoveries).toEqual([
      expect.objectContaining({ kind: 'match' }),
    ]);
    const addToFirst = jest.spyOn(first, 'addDiscoveries');

    act(() => result.current.personal.reload());

    expect(result.current.discoveries.isLoading).toBe(true);
    await waitFor(() => expect(result.current.discoveries.isLoading).toBe(false));
    expect(result.current.discoveries.discoveries).toEqual([
      expect.objectContaining({ kind: 'agree' }),
    ]);

    await act(async () => {
      await result.current.discoveries.addDiscoveries([
        { kind: 'match', questionId: 'q-match-01', strength: 'maybe' },
      ]);
    });

    expect(addToFirst).not.toHaveBeenCalled();
    expect(await second.listDiscoveries()).toHaveLength(2);
  });

  it('should read the questions again from the new repository, and write only to it', async () => {
    const { first, second, wrapper } = makeReloadingSource();
    await first.savePlayerQuestion({ ...questionDraft, text: 'Question 1' });
    await second.savePlayerQuestion({ ...questionDraft, text: 'Question 2' });
    const { result } = renderHook(
      () => ({ personal: usePersonalData(), questions: useCustomQuestions() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.questions.isLoading).toBe(false));
    expect(result.current.questions.questions).toEqual([
      expect.objectContaining({ text: 'Question 1' }),
    ]);
    const saveToFirst = jest.spyOn(first, 'savePlayerQuestion');

    act(() => result.current.personal.reload());

    expect(result.current.questions.isLoading).toBe(true);
    await waitFor(() => expect(result.current.questions.isLoading).toBe(false));
    expect(result.current.questions.questions).toEqual([
      expect.objectContaining({ text: 'Question 2' }),
    ]);

    await act(async () => {
      await result.current.questions.save({ ...questionDraft, text: 'Question 3' });
    });

    expect(saveToFirst).not.toHaveBeenCalled();
    expect(await second.listPlayerQuestions()).toHaveLength(2);
  });
});
