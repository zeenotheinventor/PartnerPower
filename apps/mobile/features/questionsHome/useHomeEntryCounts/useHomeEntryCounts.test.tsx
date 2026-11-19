import { copy, fillCopy } from '@getfreak/content';
import { renderHook, waitFor } from '@testing-library/react-native';

import { makeOwnQuestionsFixture } from '../../ownQuestions/testing/ownQuestionsFixture';
import { useHomeEntryCounts } from './useHomeEntryCounts';

// The default storage runs over an in-memory backend.
jest.mock('expo-sqlite/kv-store', () => {
  const { createInMemoryBackend } = jest.requireActual<
    typeof import('../../../storage/createInMemoryBackend')
  >('../../../storage/createInMemoryBackend');
  return { __esModule: true, default: createInMemoryBackend() };
});

describe('useHomeEntryCounts', () => {
  it('should give no line for either count until the store has been read', () => {
    const { Providers } = makeOwnQuestionsFixture({ holdLoad: true });

    const { result } = renderHook(() => useHomeEntryCounts(), { wrapper: Providers });

    expect(result.current).toEqual({ discoveries: undefined, ownQuestions: undefined });
  });

  it('should say nothing yet and none yet for an empty store', async () => {
    const { Providers } = makeOwnQuestionsFixture();

    const { result } = renderHook(() => useHomeEntryCounts(), { wrapper: Providers });

    await waitFor(() =>
      expect(result.current).toEqual({
        discoveries: copy.questionsHome.discoveriesNone,
        ownQuestions: copy.questionsHome.ownNone,
      }),
    );
  });

  it('should count what is saved and what is written, each in its own words', async () => {
    const { Providers, repository } = makeOwnQuestionsFixture({ shippedTexts: ['Shipped one'] });
    await repository.addDiscoveries([{ kind: 'match', questionId: 'shipped-1', strength: 'yes' }]);
    await repository.savePlayerQuestion({
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      text: 'Placeholder question',
    });
    await repository.savePlayerQuestion({
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      text: 'Another placeholder question',
    });

    const { result } = renderHook(() => useHomeEntryCounts(), { wrapper: Providers });

    await waitFor(() =>
      expect(result.current).toEqual({
        discoveries: fillCopy(copy.questionsHome.discoveriesCount, { count: 1 }),
        ownQuestions: fillCopy(copy.questionsHome.ownCount, { count: 2 }),
      }),
    );
  });
});
