import { act, renderHook, waitFor } from '@testing-library/react-native';

import { makePersonalDataFixture } from './testing/personalDataWrapper';
import { useCustomQuestions } from './useCustomQuestions';

const draft = { format: 'ifYou', category: 'c1', topic: 't1', text: 'Question 1' } as const;

function renderCustomQuestions() {
  const fixture = makePersonalDataFixture();
  const rendered = renderHook(() => useCustomQuestions(), { wrapper: fixture.wrapper });
  return { ...fixture, ...rendered };
}

describe('useCustomQuestions', () => {
  it('should list no questions once loaded when none are stored', async () => {
    const { result } = renderCustomQuestions();
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.questions).toEqual([]);
  });

  it('should save a question, list it and report the saved question', async () => {
    const { result } = renderCustomQuestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saved: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      saved = await result.current.save(draft);
    });

    expect(saved).toEqual({ ok: true, saved: expect.objectContaining({ text: 'Question 1' }) });
    expect(result.current.questions).toEqual([expect.objectContaining({ text: 'Question 1' })]);
  });

  it('should report the problems of a rejected question and list nothing', async () => {
    const { result } = renderCustomQuestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saved: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      saved = await result.current.save({ ...draft, text: ' ' });
    });

    expect(saved).toEqual({ ok: false, reason: 'invalid', problems: ['empty'] });
    expect(result.current.questions).toEqual([]);
  });

  it('should remove a question', async () => {
    const { result } = renderCustomQuestions();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let id = '';
    await act(async () => {
      const saved = await result.current.save(draft);
      id = saved.ok ? saved.saved.id : '';
    });

    await act(async () => {
      await result.current.remove(id);
    });

    expect(result.current.questions).toEqual([]);
  });
});
