import { limits } from '@getfreak/core';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { makeOwnQuestionsFixture } from '../testing/ownQuestionsFixture';
import { useOwnQuestions } from './useOwnQuestions';

const draft = {
  format: 'ifYou',
  category: 'c1',
  topic: 't1',
  text: 'Placeholder question 1',
} as const;

async function renderOwnQuestions() {
  const fixture = makeOwnQuestionsFixture();
  const rendered = renderHook(() => useOwnQuestions(), { wrapper: fixture.Providers });
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  return { ...fixture, ...rendered };
}

describe('OwnQuestionsProvider', () => {
  it('should be loading until the store has been read', async () => {
    const { Providers } = makeOwnQuestionsFixture();

    const { result } = renderHook(() => useOwnQuestions(), { wrapper: Providers });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should list the questions that are stored', async () => {
    const fixture = makeOwnQuestionsFixture();
    await fixture.repository.savePlayerQuestion(draft);
    const { result } = renderHook(() => useOwnQuestions(), { wrapper: fixture.Providers });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.questions).toEqual([
      expect.objectContaining({ text: 'Placeholder question 1' }),
    ]);
  });

  it('should show a saved question to every screen that reads the list', async () => {
    const fixture = makeOwnQuestionsFixture();
    const rendered = renderHook(() => ({ first: useOwnQuestions(), second: useOwnQuestions() }), {
      wrapper: fixture.Providers,
    });
    await waitFor(() => expect(rendered.result.current.first.isLoading).toBe(false));

    await act(async () => {
      await rendered.result.current.first.save(draft);
    });

    expect(rendered.result.current.second.questions).toHaveLength(1);
  });

  it('should remove a question and its discoveries', async () => {
    const { result, repository } = await renderOwnQuestions();
    let id = '';
    await act(async () => {
      const saved = await result.current.save({
        format: 'eitherOr',
        category: 'c1',
        topic: 't1',
        text: '',
        options: ['Option a', 'Option b'],
      });
      id = saved.ok ? saved.saved.id : '';
    });
    await repository.addDiscoveries([{ kind: 'agree', questionId: id, optionId: 'o1' }]);
    expect(await repository.listDiscoveries()).toHaveLength(1);

    await act(async () => {
      await result.current.remove(id);
    });

    expect(result.current.questions).toEqual([]);
    expect(await repository.listDiscoveries()).toEqual([]);
  });

  it('should not be at the limit with fewer questions than the limit', async () => {
    const { result } = await renderOwnQuestions();

    expect(result.current.hasReachedLimit).toBe(false);
  });

  it('should be at the limit once the player holds the most questions allowed', async () => {
    const fixture = makeOwnQuestionsFixture();
    for (let number = 1; number <= limits.playerQuestions; number += 1) {
      await fixture.repository.savePlayerQuestion({
        ...draft,
        text: `Placeholder question ${number}`,
      });
    }
    const { result } = renderHook(() => useOwnQuestions(), { wrapper: fixture.Providers });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasReachedLimit).toBe(true);
  });

  it('should need a provider above it', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useOwnQuestions())).toThrow(
      'useOwnQuestions needs an OwnQuestionsProvider',
    );
  });
});
