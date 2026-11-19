import { act, renderHook, waitFor } from '@testing-library/react-native';

import { makePersonalDataFixture } from './testing/personalDataWrapper';
import { useDiscoveries } from './useDiscoveries';

const match = { kind: 'match', questionId: 'q-match-01', strength: 'yes' } as const;
const agree = { kind: 'agree', questionId: 'q-either-01', optionId: 'o1' } as const;

function renderDiscoveries() {
  const fixture = makePersonalDataFixture();
  const rendered = renderHook(() => useDiscoveries(fixture.storage), {
    wrapper: fixture.wrapper,
  });
  return { ...fixture, ...rendered };
}

describe('useDiscoveries', () => {
  const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const consoleSpies = consoleMethods.map((method) => jest.spyOn(console, method));

  afterEach(() => {
    consoleSpies.forEach((spy) => spy.mockClear());
  });

  afterAll(() => {
    consoleSpies.forEach((spy) => spy.mockRestore());
  });

  it('should list the stored discoveries once they have loaded', async () => {
    const { repository, storage, wrapper } = makePersonalDataFixture();
    await repository.addDiscoveries([match]);

    const { result } = renderHook(() => useDiscoveries(storage), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.discoveries).toEqual([{ ...match, date: '1970-01-01T00:00:00.001Z' }]);
  });

  it('should save discoveries by default', async () => {
    const { result } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.saveDiscoveries).toBe(true);
  });

  it('should add discoveries, stamped with the date, and list them', async () => {
    const { result } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addDiscoveries([match, agree]);
    });

    expect(result.current.discoveries).toEqual([
      { ...match, date: '1970-01-01T00:00:00.001Z' },
      { ...agree, date: '1970-01-01T00:00:00.001Z' },
    ]);
  });

  it('should add nothing when saving is off, and delete nothing by turning it off', async () => {
    const { result } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addDiscoveries([match]);
    });

    await act(async () => {
      await result.current.setSaveDiscoveries(false);
    });
    await act(async () => {
      await result.current.addDiscoveries([agree]);
    });

    expect(result.current.saveDiscoveries).toBe(false);
    expect(result.current.discoveries).toEqual([expect.objectContaining(match)]);
  });

  it('should show the new switch value before the write is done', async () => {
    const { result } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let finished: Promise<void> = Promise.resolve();
    act(() => {
      finished = result.current.setSaveDiscoveries(false);
    });

    expect(result.current.saveDiscoveries).toBe(false);
    await act(async () => finished);
  });

  it('should start adding again when saving is turned back on', async () => {
    const { result } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.setSaveDiscoveries(false);
    });

    await act(async () => {
      await result.current.setSaveDiscoveries(true);
    });
    await act(async () => {
      await result.current.addDiscoveries([agree]);
    });

    expect(result.current.discoveries).toEqual([expect.objectContaining(agree)]);
  });

  it('should read the switch from storage, so another screen that turned it off is respected', async () => {
    const { result, storage } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await storage.set('questionPreferences', { saveDiscoveries: false });

    await act(async () => {
      await result.current.addDiscoveries([agree]);
    });

    expect(result.current.discoveries).toEqual([]);
  });

  it('should keep the switch after the hook is rendered again', async () => {
    const { result, storage, wrapper, unmount } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.setSaveDiscoveries(false);
    });
    unmount();

    const second = renderHook(() => useDiscoveries(storage), { wrapper });
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));

    expect(second.result.current.saveDiscoveries).toBe(false);
  });

  it('should fall back to the default when the stored value is not valid', async () => {
    const { storage, wrapper } = makePersonalDataFixture();
    await storage.set('questionPreferences', { saveDiscoveries: 'no' });

    const { result } = renderHook(() => useDiscoveries(storage), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.saveDiscoveries).toBe(true);
  });

  it('should remove one discovery by its key', async () => {
    const { result } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addDiscoveries([match, agree]);
    });

    await act(async () => {
      await result.current.removeDiscovery({ kind: 'match', questionId: 'q-match-01' });
    });

    expect(result.current.discoveries).toEqual([expect.objectContaining(agree)]);
  });

  it('should clear every discovery', async () => {
    const { result } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addDiscoveries([match, agree]);
    });

    await act(async () => {
      await result.current.clearDiscoveries();
    });

    expect(result.current.discoveries).toEqual([]);
  });

  it('should not reject when the switch cannot be stored, and still count it for this session', async () => {
    const { result, storage } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    jest.spyOn(storage, 'set').mockRejectedValue(new Error('The write failed'));

    await act(async () => {
      await result.current.setSaveDiscoveries(false);
    });

    expect(result.current.saveDiscoveries).toBe(false);
  });

  it('should add nothing after the switch is turned off even when the write failed', async () => {
    const { result, storage, repository } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    jest.spyOn(storage, 'set').mockRejectedValue(new Error('The write failed'));

    await act(async () => {
      await result.current.setSaveDiscoveries(false);
    });
    await act(async () => {
      await result.current.addDiscoveries([agree]);
    });

    expect(await repository.listDiscoveries()).toEqual([]);
  });

  it('should follow storage again once the switch was stored, so another screen can change it', async () => {
    const { result, storage } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.setSaveDiscoveries(false);
    });
    await storage.set('questionPreferences', { saveDiscoveries: true });

    await act(async () => {
      await result.current.addDiscoveries([agree]);
    });

    expect(result.current.discoveries).toEqual([expect.objectContaining(agree)]);
  });

  it('should not log anything', async () => {
    const { result } = renderDiscoveries();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addDiscoveries([
        { kind: 'answer', questionId: 'q-match-01', optionId: 'o1', answererName: 'Name 1' },
      ]);
      await result.current.setSaveDiscoveries(false);
      await result.current.clearDiscoveries();
    });

    consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
