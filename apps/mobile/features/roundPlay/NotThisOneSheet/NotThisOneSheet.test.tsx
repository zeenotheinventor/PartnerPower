import { copy } from '@getfreak/content';
import { fireEvent, screen, within } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { NotThisOneSheet } from './NotThisOneSheet';
import type { SheetCategory } from './types';

const allOn: SheetCategory[] = [
  { category: 'c1', name: 'Group one', isOn: true },
  { category: 'c2', name: 'Group two', isOn: true },
  { category: 'c3', name: 'Group three', isOn: true },
];

function renderSheet(categories: readonly SheetCategory[] = allOn, visible = true) {
  const onSkip = jest.fn();
  const onSwitchOff = jest.fn();
  const onClose = jest.fn();
  const rendered = renderThemed(
    <NotThisOneSheet
      visible={visible}
      categories={categories}
      onSkip={onSkip}
      onSwitchOff={onSwitchOff}
      onClose={onClose}
    />,
  );
  return { rendered, onSkip, onSwitchOff, onClose };
}

describe('NotThisOneSheet', () => {
  it('should show nothing while it is closed', async () => {
    await renderSheet(allOn, false).rendered;

    expect(screen.queryByText(copy.roundPlay.sheetTitle)).not.toBeOnTheScreen();
  });

  it('should be a modal dialog named by its title, with the title as a heading', async () => {
    await renderSheet().rendered;

    const sheet = screen.getByLabelText(copy.roundPlay.sheetTitle);
    expect(sheet).toHaveProp('role', 'dialog');
    expect(sheet).toHaveProp('accessibilityViewIsModal', true);
    expect(
      within(sheet).getByRole('header', { name: copy.roundPlay.sheetTitle }),
    ).toBeOnTheScreen();
  });

  it('should offer to skip the card, and say that a new card is drawn and nobody drinks', async () => {
    await renderSheet().rendered;

    expect(screen.getByRole('button', { name: copy.roundPlay.skipTitle })).toHaveProp(
      'accessibilityHint',
      copy.roundPlay.skipBody,
    );
    expect(screen.getByText(copy.roundPlay.skipBody)).toBeOnTheScreen();
  });

  it('should word the skip row with the title and hint it is given', async () => {
    await renderThemed(
      <NotThisOneSheet
        visible
        categories={allOn}
        skipTitle="Skip this thing"
        skipHint="Another thing is drawn."
        onSkip={jest.fn()}
        onSwitchOff={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Skip this thing' })).toHaveProp(
      'accessibilityHint',
      'Another thing is drawn.',
    );
    expect(screen.getByText('Another thing is drawn.')).toBeOnTheScreen();
    expect(screen.queryByText(copy.roundPlay.skipTitle)).not.toBeOnTheScreen();
  });

  it('should skip from the skip row', async () => {
    const { rendered, onSkip } = renderSheet();
    await rendered;

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.skipTitle }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('should label the switches, and show one switch per category', async () => {
    await renderSheet().rendered;

    expect(screen.getByText(copy.roundPlay.switchOffLabel)).toBeOnTheScreen();
    expect(screen.getAllByRole('switch')).toHaveLength(3);
    expect(screen.getByRole('switch', { name: 'Group two', checked: true })).toBeOnTheScreen();
  });

  it('should switch a category off from its switch', async () => {
    const { rendered, onSwitchOff } = renderSheet();
    await rendered;

    fireEvent.press(screen.getByRole('switch', { name: 'Group two' }));

    expect(onSwitchOff).toHaveBeenCalledWith('c2');
  });

  it('should show a category that is already off as off, and leave it alone when pressed', async () => {
    const { rendered, onSwitchOff } = renderSheet([
      { category: 'c1', name: 'Group one', isOn: true },
      { category: 'c2', name: 'Group two', isOn: false },
    ]);
    await rendered;

    const off = screen.getByRole('switch', { name: 'Group two', checked: false, disabled: true });
    expect(off).toHaveProp('accessibilityHint', copy.roundPlay.switchedOffHint);
    fireEvent.press(off);

    expect(onSwitchOff).not.toHaveBeenCalled();
  });

  describe('when one category is left on', () => {
    const lastOn: SheetCategory[] = [
      { category: 'c1', name: 'Group one', isOn: false },
      { category: 'c2', name: 'Group two', isOn: true },
    ];

    it('should lock that category, and say why', async () => {
      const { rendered, onSwitchOff } = renderSheet(lastOn);
      await rendered;

      const locked = screen.getByRole('switch', {
        name: 'Group two',
        checked: true,
        disabled: true,
      });
      expect(locked).toHaveProp('accessibilityHint', copy.roundSetup.lastCategoryHint);
      expect(screen.getByText(copy.roundSetup.lastCategoryHint)).toBeOnTheScreen();
      fireEvent.press(locked);
      expect(onSwitchOff).not.toHaveBeenCalled();
    });
  });

  it('should not show the last category hint while several are on', async () => {
    await renderSheet().rendered;

    expect(screen.queryByText(copy.roundSetup.lastCategoryHint)).not.toBeOnTheScreen();
  });

  it('should keep Keep playing clear of the bottom system bar, as the sheet sits at the screen edge', async () => {
    await renderSheet().rendered;

    const edgesOfAncestors: unknown[] = [];
    for (
      let node = screen.getByRole('button', { name: copy.roundPlay.sheetClose }).parent;
      node;
      node = node.parent
    ) {
      edgesOfAncestors.push(node.props.edges);
    }

    expect(edgesOfAncestors).toContainEqual(['bottom']);
  });

  it('should close from Keep playing', async () => {
    const { rendered, onClose, onSkip } = renderSheet();
    await rendered;

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.sheetClose }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('should close when the system asks to, as the Android back button does', async () => {
    const { rendered, onClose } = renderSheet();
    await rendered;

    fireEvent(screen.getByRole('header', { name: copy.roundPlay.sheetTitle }), 'requestClose');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
