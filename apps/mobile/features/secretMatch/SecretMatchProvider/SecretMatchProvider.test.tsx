import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  firstPlayerName,
  makeSecretMatchQuestions,
  ratingsOf,
  secondPlayerName,
  secretMatchSetup,
} from '../testing/secretMatchFixtures';
import { SecretMatchProvider } from './SecretMatchProvider';
import { useSecretMatch } from './useSecretMatch';

const questions = makeSecretMatchQuestions();

function renderSecretMatch() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SecretMatchProvider>{children}</SecretMatchProvider>
  );
  return renderHook(() => useSecretMatch(), { wrapper });
}

function ratePass(
  result: ReturnType<typeof renderSecretMatch>['result'],
  ratings: readonly ('yes' | 'maybe' | 'no')[],
) {
  ratings.forEach((rating) => {
    act(() => result.current.dispatch({ type: 'rate', rating }));
  });
}

describe('SecretMatchProvider', () => {
  it('should hold no session and no names until one has started', () => {
    const { result } = renderSecretMatch();

    expect(result.current.view).toBeUndefined();
    expect(result.current.players).toBeUndefined();
    expect(result.current.matchesToSave).toEqual([]);
  });

  it('should start a session on the first item of the first pass, with the names it started with', () => {
    const { result } = renderSecretMatch();

    act(() => result.current.start(secretMatchSetup, questions));

    expect(result.current.view).toEqual(
      expect.objectContaining({ phase: 'rating', pass: 0, playerName: firstPlayerName }),
    );
    expect(result.current.players).toEqual([firstPlayerName, secondPlayerName]);
  });

  it('should move through the engine with the actions it is sent', () => {
    const { result } = renderSecretMatch();
    act(() => result.current.start(secretMatchSetup, questions));

    act(() => result.current.dispatch({ type: 'rate', rating: 'yes' }));

    expect(result.current.view).toEqual(expect.objectContaining({ phase: 'rating', position: 2 }));
  });

  it('should give the matches to save only once the session is revealed', () => {
    const { result } = renderSecretMatch();
    act(() => result.current.start(secretMatchSetup, questions));

    ratePass(result, ratingsOf(['yes', 'maybe', 'no']));
    expect(result.current.matchesToSave).toEqual([]);
    act(() => result.current.dispatch({ type: 'startSecondPass' }));
    ratePass(result, ratingsOf(['yes']));

    expect(result.current.view?.phase).toBe('revealed');
    expect(result.current.matchesToSave).toHaveLength(8);
    expect(result.current.matchesToSave[0]).toEqual({
      kind: 'match',
      questionId: expect.any(String),
      strength: expect.stringMatching(/^(yes|maybe)$/),
    });
  });

  it('should wipe the session when it is stopped', () => {
    const { result } = renderSecretMatch();
    act(() => result.current.start(secretMatchSetup, questions));

    act(() => result.current.dispatch({ type: 'stop' }));

    expect(result.current.view).toEqual({ phase: 'stopped' });
    expect(result.current.matchesToSave).toEqual([]);
  });

  it('should ignore an action before a session has started', () => {
    const { result } = renderSecretMatch();

    act(() => result.current.dispatch({ type: 'rate', rating: 'yes' }));

    expect(result.current.view).toBeUndefined();
  });

  it('should replace the session when another one starts', () => {
    const { result } = renderSecretMatch();
    act(() => result.current.start(secretMatchSetup, questions));
    act(() => result.current.dispatch({ type: 'rate', rating: 'yes' }));

    act(() => result.current.start(secretMatchSetup, questions));

    expect(result.current.view).toEqual(expect.objectContaining({ position: 1 }));
  });

  it('should throw when it is used without a provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSecretMatch())).toThrow(/SecretMatchProvider/);

    spy.mockRestore();
  });
});
