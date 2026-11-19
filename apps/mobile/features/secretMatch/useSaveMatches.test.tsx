import type { NewDiscovery } from '@getfreak/core';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useSaveMatches } from './useSaveMatches';

const mockAddDiscoveries = jest.fn();
let mockIsLoading = false;
let mockSaveDiscoveries = true;
jest.mock('../../personal', () => ({
  useDiscoveries: () => ({
    addDiscoveries: mockAddDiscoveries,
    isLoading: mockIsLoading,
    saveDiscoveries: mockSaveDiscoveries,
  }),
}));

const matches: NewDiscovery[] = [
  { kind: 'match', questionId: 'item-1', strength: 'yes' },
  { kind: 'match', questionId: 'item-2', strength: 'maybe' },
];

describe('useSaveMatches', () => {
  beforeEach(() => {
    mockAddDiscoveries.mockResolvedValue(undefined);
    mockIsLoading = false;
    mockSaveDiscoveries = true;
  });

  afterEach(() => {
    mockAddDiscoveries.mockReset();
  });

  it('should save the matches through addDiscoveries, and say they are saved', async () => {
    const { result } = renderHook(() => useSaveMatches(matches));

    expect(mockAddDiscoveries).toHaveBeenCalledWith(matches);
    await waitFor(() => expect(result.current).toBe('saved'));
  });

  it('should say nothing while the save is under way', () => {
    mockAddDiscoveries.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSaveMatches(matches));

    expect(result.current).toBeNull();
  });

  it('should save only once, even when it is given a new list of the same matches', async () => {
    const { result, rerender } = renderHook(() => useSaveMatches([...matches]));
    await waitFor(() => expect(result.current).toBe('saved'));

    rerender({});
    rerender({});

    expect(mockAddDiscoveries).toHaveBeenCalledTimes(1);
  });

  it('should say that saving is off when it is, after asking to save', async () => {
    mockSaveDiscoveries = false;

    const { result } = renderHook(() => useSaveMatches(matches));

    await waitFor(() => expect(result.current).toBe('savingOff'));
    expect(mockAddDiscoveries).toHaveBeenCalledTimes(1);
  });

  it('should say nothing until the saving switch has been read', async () => {
    mockIsLoading = true;

    const { result } = renderHook(() => useSaveMatches(matches));
    await waitFor(() => expect(mockAddDiscoveries).toHaveBeenCalled());

    expect(result.current).toBeNull();
  });

  it('should say nothing when the save fails, rather than claim it worked', async () => {
    mockAddDiscoveries.mockRejectedValue(new Error('write failed'));

    const { result } = renderHook(() => useSaveMatches(matches));
    await waitFor(() => expect(mockAddDiscoveries).toHaveBeenCalled());
    await act(async () => {});

    expect(result.current).toBeNull();
  });

  it('should save nothing when there are no matches', () => {
    const { result } = renderHook(() => useSaveMatches([]));

    expect(mockAddDiscoveries).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });
});
