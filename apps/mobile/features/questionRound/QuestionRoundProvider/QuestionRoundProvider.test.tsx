import type { Question, QuestionRoundSetup } from '@getfreak/core';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { QuestionRoundProvider } from './QuestionRoundProvider';
import { useQuestionRound } from './useQuestionRound';

const questions: Question[] = [
  {
    id: 'question-1',
    format: 'ifYou',
    category: 'c1',
    topic: 't1',
    source: 'shipped',
    text: 'Question 1',
  },
  {
    id: 'question-2',
    format: 'ifYou',
    category: 'c1',
    topic: 't1',
    source: 'shipped',
    text: 'Question 2',
  },
];

const setup: QuestionRoundSetup = {
  players: ['Player A', 'Player B'],
  level: 'l1',
  enabledCategories: ['c1'],
  enabledFormats: ['ifYou'],
  enabledTopics: ['t1'],
  length: 10,
  seed: 7,
};

function renderRound() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QuestionRoundProvider>{children}</QuestionRoundProvider>
  );
  return renderHook(() => useQuestionRound(), { wrapper });
}

describe('QuestionRoundProvider', () => {
  it('should hold no round until one is started', () => {
    const { result } = renderRound();

    expect(result.current.round).toBeUndefined();
  });

  it('should hold the round that a started round gives', () => {
    const { result } = renderRound();

    act(() => result.current.startNewRound(setup, questions));

    expect(result.current.round?.players).toEqual(['Player A', 'Player B']);
    expect(result.current.round?.current?.question.format).toBe('ifYou');
  });

  it('should replace the round when another is started', () => {
    const { result } = renderRound();
    act(() => result.current.startNewRound(setup, questions));

    act(() =>
      result.current.startNewRound({ ...setup, players: ['Player C', 'Player D'] }, questions),
    );

    expect(result.current.round?.players).toEqual(['Player C', 'Player D']);
    expect(result.current.round?.history).toEqual([]);
  });

  it('should apply a round action through the round engine', () => {
    const { result } = renderRound();
    act(() => result.current.startNewRound(setup, questions));

    act(() => result.current.dispatch({ type: 'answer', answers: [true, false] }));
    expect(result.current.round?.current?.stage).toBe('revealed');

    act(() => result.current.dispatch({ type: 'end' }));
    expect(result.current.round?.current).toBeNull();
  });

  it('should ignore a round action while there is no round', () => {
    const { result } = renderRound();

    act(() => result.current.dispatch({ type: 'end' }));

    expect(result.current.round).toBeUndefined();
  });

  it('should hold no last start until a round is started', () => {
    const { result } = renderRound();

    expect(result.current.lastStart).toBeUndefined();
  });

  it('should keep the setup and questions of the round that was last started', () => {
    const { result } = renderRound();

    act(() => result.current.startNewRound(setup, questions));
    act(() => result.current.dispatch({ type: 'answer', answers: [true, true] }));

    expect(result.current.lastStart).toEqual({ setup, questions });
  });

  it('should replace the last start when another round is started', () => {
    const { result } = renderRound();
    act(() => result.current.startNewRound(setup, questions));

    act(() => result.current.startNewRound({ ...setup, seed: 8 }, questions));

    expect(result.current.lastStart?.setup.seed).toBe(8);
  });

  it('should fail clearly when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useQuestionRound())).toThrow(
      'useQuestionRound needs a QuestionRoundProvider',
    );
  });
});
