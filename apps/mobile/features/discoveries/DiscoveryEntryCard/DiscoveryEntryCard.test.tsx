import { fireEvent, screen } from 'nativewind/test';

import { renderWithMockFeedback } from '../../../feedback/renderWithMockFeedback';
import { DiscoveryEntryCard } from './DiscoveryEntryCard';

describe('DiscoveryEntryCard', () => {
  it('should remove by the plain values it was given, with the tap feedback and not select', async () => {
    const onRemove = jest.fn();
    const feedback = await renderWithMockFeedback(
      <DiscoveryEntryCard
        kind="answer"
        questionId="q-1"
        answererName="Player A"
        topicName="Topic"
        text="Question"
        removeText="Remove"
        removeLabel="Remove, Question"
        onRemove={onRemove}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Remove, Question' }));

    expect(onRemove).toHaveBeenCalledWith('answer', 'q-1', 'Player A');
    expect(feedback.tap).toHaveBeenCalledTimes(1);
    expect(feedback.select).not.toHaveBeenCalled();
  });
});
