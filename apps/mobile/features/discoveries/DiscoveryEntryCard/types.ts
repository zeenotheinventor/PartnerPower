import type { DiscoveryKey } from '../../../storage';

export type DiscoveryEntryCardProps = {
  /** Which stored discovery the remove control removes. */
  discoveryKey: DiscoveryKey;
  topicName: string;
  /** The words that lead the question, in the accent colour, such as "Would you rather". */
  lead?: string;
  text?: string;
  /** What was answered, in a muted line under the question. */
  answerLine?: string;
  /** For a match, how strong it is. A strong match is filled with the accent colour. */
  strengthLabel?: string;
  isStrongMatch?: boolean;
  /** The label of the remove control. */
  removeLabel: string;
  /** The visible word on the remove control. */
  removeText: string;
  onRemove: (key: DiscoveryKey) => void;
};
