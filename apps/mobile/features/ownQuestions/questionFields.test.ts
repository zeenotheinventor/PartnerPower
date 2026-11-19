import { copy } from '@getfreak/content';

import { fieldErrors, optionsForFormat } from './questionFields';

describe('optionsForFormat', () => {
  it('should drop every option for a format with none', () => {
    expect(optionsForFormat('ifYou', ['A', 'B', 'C'])).toEqual([]);
    expect(optionsForFormat('neverHave', ['A', 'B'])).toEqual([]);
  });

  it('should keep the first two options for would you rather', () => {
    expect(optionsForFormat('eitherOr', ['A', 'B', 'C', 'D'])).toEqual(['A', 'B']);
  });

  it('should add empty options up to two for would you rather', () => {
    expect(optionsForFormat('eitherOr', ['A'])).toEqual(['A', '']);
    expect(optionsForFormat('eitherOr', [])).toEqual(['', '']);
  });

  it('should keep up to four options for guess your partner, and at least two', () => {
    expect(optionsForFormat('guess', ['A', 'B', 'C'])).toEqual(['A', 'B', 'C']);
    expect(optionsForFormat('guess', ['A', 'B', 'C', 'D', 'E'])).toEqual(['A', 'B', 'C', 'D']);
    expect(optionsForFormat('guess', [])).toEqual(['', '']);
  });
});

describe('fieldErrors', () => {
  const message = copy.ownQuestions;

  it('should put an empty text under the text field', () => {
    expect(fieldErrors({ format: 'ifYou', text: '  ', options: [] }, ['empty'])).toEqual({
      text: message.errorEmpty,
      options: [],
    });
  });

  it('should put a text that is too long under the text field', () => {
    expect(
      fieldErrors({ format: 'ifYou', text: 'a'.repeat(141), options: [] }, ['tooLong']),
    ).toEqual({ text: message.errorTooLong, options: [] });
  });

  it('should put a text already written under the text field', () => {
    expect(fieldErrors({ format: 'neverHave', text: 'Same', options: [] }, ['duplicate'])).toEqual({
      text: message.errorDuplicate,
      options: [],
    });
  });

  it('should not complain about the text of a would you rather question that has none', () => {
    expect(fieldErrors({ format: 'eitherOr', text: ' ', options: ['A', ''] }, ['empty'])).toEqual({
      options: [undefined, message.errorOptionEmpty],
    });
  });

  it('should put the repeat under the second of two options that match', () => {
    expect(
      fieldErrors({ format: 'guess', text: 'Q', options: ['One', ' one ', 'Three'] }, [
        'duplicate',
      ]),
    ).toEqual({ options: [undefined, message.errorOptionRepeat, undefined] });
  });

  it('should put an option that is too long under that option', () => {
    expect(
      fieldErrors({ format: 'guess', text: 'Q', options: ['One', 'x'.repeat(141)] }, ['tooLong']),
    ).toEqual({ options: [undefined, message.errorTooLong] });
  });

  it('should put an empty option under that option and an empty text under the text', () => {
    expect(fieldErrors({ format: 'guess', text: '', options: ['', 'Two'] }, ['empty'])).toEqual({
      text: message.errorEmpty,
      options: [message.errorOptionEmpty, undefined],
    });
  });

  it('should leave a repeat of a stored text to the text when no options match', () => {
    expect(
      fieldErrors({ format: 'guess', text: 'Taken', options: ['One', 'Two'] }, ['duplicate']),
    ).toEqual({ text: message.errorDuplicate, options: [undefined, undefined] });
  });

  it('should show the save failure under the text when no field explains the problems', () => {
    expect(
      fieldErrors({ format: 'guess', text: 'Q', options: ['One', 'Two'] }, ['optionCount']),
    ).toEqual({ text: message.writeFailed, options: [undefined, undefined] });
  });
});
