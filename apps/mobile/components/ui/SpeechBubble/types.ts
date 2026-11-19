export type SpeechBubbleTail = 'left' | 'center' | 'right';

export type SpeechBubbleProps = {
  /** What the character says. The caller passes it in from content. */
  text: string;
  /** Where the tail sits along the bottom edge, so it points at the character below. */
  tail?: SpeechBubbleTail;
  /** Pops the bubble in when it first shows. Reduced motion shows it at once. */
  popIn?: boolean;
};
