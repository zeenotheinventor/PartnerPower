import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createInMemoryPersonalRepository } from '../../storage/personal/createInMemoryPersonalRepository';
import type { PersonalRepository } from '../../storage';
import { PersonalDataProvider } from './PersonalDataProvider';
import type { PersonalDataSource } from './types';
import { usePersonalData } from './usePersonalData';

const shippedCards = [{ id: 'starter-c1-01', text: 'Shipped card 1' }];

function makeRepository(recoveredFromUnreadable = false): PersonalRepository {
  return createInMemoryPersonalRepository({
    getShippedCards: () => shippedCards,
    randomUUID: () => '00000000-0000-4000-8000-000000000001',
    now: () => 1,
    recoveredFromUnreadable,
  });
}

function makeSource(load: () => Promise<PersonalRepository>): PersonalDataSource {
  return { load, createEmpty: () => makeRepository() };
}

function renderPersonalData(source: PersonalDataSource) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PersonalDataProvider source={source}>{children}</PersonalDataProvider>
  );
  return renderHook(() => usePersonalData(), { wrapper });
}

const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;

describe('PersonalDataProvider', () => {
  const consoleSpies = consoleMethods.map((method) => jest.spyOn(console, method));

  afterEach(() => {
    consoleSpies.forEach((spy) => spy.mockClear());
  });

  afterAll(() => {
    consoleSpies.forEach((spy) => spy.mockRestore());
  });

  function expectNothingLogged() {
    consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  }

  it('should be loading, with an empty store, until the database has opened', async () => {
    let finishLoad: (repository: PersonalRepository) => void = () => {};
    const { result } = renderPersonalData(
      makeSource(() => new Promise<PersonalRepository>((resolve) => (finishLoad = resolve))),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.loadFailed).toBe(false);
    expect(await result.current.repository.listPlayerCards()).toEqual([]);

    await act(async () => {
      finishLoad(makeRepository());
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should give the loaded repository once the database has opened', async () => {
    const loaded = makeRepository();
    await loaded.setFavourite('starter-c1-01', true);
    const { result } = renderPersonalData(makeSource(() => Promise.resolve(loaded)));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.loadFailed).toBe(false);
    expect(await result.current.repository.listFavourites()).toEqual(['starter-c1-01']);
    expectNothingLogged();
  });

  it('should open the database once, not on every render', async () => {
    const load = jest.fn(() => Promise.resolve(makeRepository()));
    const { result, rerender } = renderPersonalData(makeSource(load));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({});

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('should show an empty store and a failure flag when the database cannot be opened', async () => {
    const { result } = renderPersonalData(
      makeSource(() => Promise.reject(new Error('The database failed'))),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.loadFailed).toBe(true);
    expect(await result.current.repository.listPlayerCards()).toEqual([]);
    expect(result.current.recoveredFromUnreadable).toBe(false);
    expectNothingLogged();
  });

  it('should report a recovery, and stop reporting it once dismissed', async () => {
    const { result } = renderPersonalData(makeSource(() => Promise.resolve(makeRepository(true))));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.recoveredFromUnreadable).toBe(true);

    act(() => result.current.dismissRecoveryNotice());

    expect(result.current.recoveredFromUnreadable).toBe(false);
  });

  it('should not report a recovery when the database opened normally', async () => {
    const { result } = renderPersonalData(makeSource(() => Promise.resolve(makeRepository())));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.recoveredFromUnreadable).toBe(false);
  });

  it('should ignore a load that finishes after the source has been replaced', async () => {
    let finishStaleLoad: (repository: PersonalRepository) => void = () => {};
    const staleSource = makeSource(
      () => new Promise<PersonalRepository>((resolve) => (finishStaleLoad = resolve)),
    );
    let sourceInUse = staleSource;
    const { result, rerender } = renderHook(() => usePersonalData(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <PersonalDataProvider source={sourceInUse}>{children}</PersonalDataProvider>
      ),
    });
    sourceInUse = makeSource(() => Promise.resolve(makeRepository()));
    rerender({});
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const staleRepository = makeRepository(true);

    await act(async () => {
      finishStaleLoad(staleRepository);
    });

    expect(result.current.recoveredFromUnreadable).toBe(false);
  });

  it('should load again from the source when reloaded', async () => {
    const first = makeRepository();
    const second = makeRepository();
    await second.setFavourite('starter-c1-01', true);
    const load = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { result } = renderPersonalData(makeSource(load));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.repository).toBe(first);

    act(() => result.current.reload());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.repository).toBe(second);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('should fail clearly when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => usePersonalData())).toThrow(
      'usePersonalData needs a PersonalDataProvider',
    );
  });
});
