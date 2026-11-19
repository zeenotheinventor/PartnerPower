import { limits } from '@getfreak/core';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { makeOwnCardsFixture } from '../testing/ownCardsFixture';
import { useOwnCards } from './useOwnCards';

const draft = { category: 'c1', kind: 'solo', text: 'Placeholder dare 1' } as const;

async function renderOwnCards(options?: Parameters<typeof makeOwnCardsFixture>[0]) {
  const fixture = makeOwnCardsFixture(options);
  const rendered = renderHook(() => useOwnCards(), { wrapper: fixture.Providers });
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  return { ...fixture, ...rendered };
}

describe('OwnCardsProvider', () => {
  it('should be loading until the store has been read', async () => {
    const { Providers } = makeOwnCardsFixture();

    const { result } = renderHook(() => useOwnCards(), { wrapper: Providers });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should list no dares when none are stored', async () => {
    const { result } = await renderOwnCards();

    expect(result.current.cards).toEqual([]);
  });

  it('should list the dares that are stored', async () => {
    const fixture = makeOwnCardsFixture();
    await fixture.repository.savePlayerCard(draft);
    const { result } = renderHook(() => useOwnCards(), { wrapper: fixture.Providers });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.cards).toEqual([expect.objectContaining({ text: 'Placeholder dare 1' })]);
  });

  it('should save a dare and list it', async () => {
    const { result } = await renderOwnCards();

    let saved: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      saved = await result.current.save(draft);
    });

    expect(saved).toEqual({ ok: true, saved: expect.objectContaining({ kind: 'solo' }) });
    expect(result.current.cards).toEqual([expect.objectContaining({ text: 'Placeholder dare 1' })]);
  });

  it('should report the problems of a dare that is rejected, and list nothing', async () => {
    const { result } = await renderOwnCards();

    let saved: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      saved = await result.current.save({ ...draft, text: '   ' });
    });

    expect(saved).toEqual({ ok: false, reason: 'invalid', problems: ['empty'] });
    expect(result.current.cards).toEqual([]);
  });

  it('should reject a dare that repeats a card from the shipped deck', async () => {
    const { result } = await renderOwnCards({ shippedTexts: ['Shipped card 1'] });

    let saved: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      saved = await result.current.save({ ...draft, text: '  shipped   CARD 1 ' });
    });

    expect(saved).toEqual({ ok: false, reason: 'invalid', problems: ['duplicate'] });
  });

  it('should change a dare that is saved again with its id', async () => {
    const { result } = await renderOwnCards();
    let id = '';
    await act(async () => {
      const first = await result.current.save(draft);
      id = first.ok ? first.saved.id : '';
    });

    await act(async () => {
      await result.current.save({ ...draft, id, text: 'Placeholder dare 2', kind: 'together' });
    });

    expect(result.current.cards).toEqual([
      expect.objectContaining({ id, text: 'Placeholder dare 2', kind: 'together' }),
    ]);
  });

  it('should remove a dare', async () => {
    const { result } = await renderOwnCards();
    let id = '';
    await act(async () => {
      const first = await result.current.save(draft);
      id = first.ok ? first.saved.id : '';
    });

    await act(async () => {
      await result.current.remove(id);
    });

    expect(result.current.cards).toEqual([]);
  });

  it('should take a removed dare out of the favourites and the decks, through the repository', async () => {
    const { result, repository } = await renderOwnCards();
    let id = '';
    await act(async () => {
      const first = await result.current.save(draft);
      id = first.ok ? first.saved.id : '';
    });
    await repository.setFavourite(id, true);
    await repository.saveDeck({ name: 'Placeholder deck', cardIds: [id] });

    await act(async () => {
      await result.current.remove(id);
    });

    expect(await repository.listFavourites()).toEqual([]);
    expect(await repository.listDecks()).toEqual([
      expect.objectContaining({ name: 'Placeholder deck', cardIds: [] }),
    ]);
  });

  it('should not be at the limit with fewer dares than the limit', async () => {
    const { result } = await renderOwnCards();

    expect(result.current.hasReachedLimit).toBe(false);
  });

  it('should be at the limit once the player holds the most dares allowed', async () => {
    const fixture = makeOwnCardsFixture();
    for (let number = 1; number <= limits.playerCards; number += 1) {
      await fixture.repository.savePlayerCard({ ...draft, text: `Placeholder dare ${number}` });
    }
    const { result } = renderHook(() => useOwnCards(), { wrapper: fixture.Providers });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasReachedLimit).toBe(true);
  });

  it('should report the limit when a dare is saved at the limit', async () => {
    const fixture = makeOwnCardsFixture();
    for (let number = 1; number <= limits.playerCards; number += 1) {
      await fixture.repository.savePlayerCard({ ...draft, text: `Placeholder dare ${number}` });
    }
    const { result } = renderHook(() => useOwnCards(), { wrapper: fixture.Providers });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saved: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      saved = await result.current.save({ ...draft, text: 'One more' });
    });

    expect(saved).toEqual({ ok: false, reason: 'limit' });
  });

  it('should still list a saved dare when the read after the save fails', async () => {
    const { result, repository } = await renderOwnCards();
    jest.spyOn(repository, 'listPlayerCards').mockRejectedValue(new Error('disk'));

    await act(async () => {
      await result.current.save(draft);
    });

    expect(result.current.cards).toEqual([expect.objectContaining({ text: 'Placeholder dare 1' })]);
  });

  it('should show a changed dare once, with its new text, when the read after the save fails', async () => {
    const { result, repository } = await renderOwnCards();
    let id = '';
    await act(async () => {
      const first = await result.current.save(draft);
      id = first.ok ? first.saved.id : '';
    });
    jest.spyOn(repository, 'listPlayerCards').mockRejectedValue(new Error('disk'));

    await act(async () => {
      await result.current.save({ ...draft, id, text: 'Placeholder dare 2' });
    });

    expect(result.current.cards).toEqual([
      expect.objectContaining({ id, text: 'Placeholder dare 2' }),
    ]);
  });

  it('should not list a dare twice when the read after the save returns it', async () => {
    const { result } = await renderOwnCards();

    await act(async () => {
      await result.current.save(draft);
    });

    expect(result.current.cards).toHaveLength(1);
  });

  it('should need a provider above it', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useOwnCards())).toThrow('useOwnCards needs an OwnCardsProvider');
  });
});
