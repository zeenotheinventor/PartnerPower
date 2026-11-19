const barredWords = [
  'he',
  'she',
  'him',
  'her',
  'his',
  'hers',
  'boyfriend',
  'girlfriend',
  'husband',
  'wife',
  'drink',
  'wine',
  'shot',
  'shots',
  'booze',
  'beer',
  'tipsy',
];
const barredWordPattern = new RegExp(`\\b(${barredWords.join('|')})\\b`, 'i');

/** The house rules for text a player reads: short, no gendered words, no forfeit word. */
export function hasBarredWord(value: string): boolean {
  return barredWordPattern.test(value);
}

export function hasDashOrSemicolon(value: string): boolean {
  return /[—–;]|--/.test(value);
}
