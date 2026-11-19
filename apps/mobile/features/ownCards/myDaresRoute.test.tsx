// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, fillCopy } from '@getfreak/content';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

const setupRoute = '/games/dares/setup';
const listRoute = '/games/dares/my-dares';
const newRoute = '/games/dares/my-dares/new';

const rowName = (value: string) =>
  fillCopy(copy.roundSetup.myDaresRowName, { label: copy.roundSetup.myDaresLabel, value });

async function pressSave() {
  fireEvent.press(screen.getByRole('button', { name: copy.ownCards.save }));
  await act(async () => {});
}

// Writes one dare from the list, which is open, and ends on the list again.
async function writeDare(text: string) {
  fireEvent.press(screen.getByRole('button', { name: copy.ownCards.add }));
  await waitFor(() => expect(currentPathname()).toBe(newRoute));
  fireEvent.changeText(screen.getByLabelText(copy.ownCards.fieldLabel), text);
  await pressSave();
  await waitFor(() => expect(currentPathname()).toBe(listRoute));
}

describe('my dares in the route tree', () => {
  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  it('should open the list from the My dares row on setup', async () => {
    await launchApp(setupRoute);

    fireEvent.press(screen.getByRole('button', { name: rowName(copy.roundSetup.myDaresNone) }));
    await waitFor(() => expect(currentPathname()).toBe(listRoute));

    expect(screen.getByRole('header', { name: copy.ownCards.listTitle })).toBeOnTheScreen();
    expect(screen.getByText(copy.ownCards.emptyList)).toBeOnTheScreen();
  });

  it('should go back from the list to setup', async () => {
    await launchApp(setupRoute);
    fireEvent.press(screen.getByRole('button', { name: rowName(copy.roundSetup.myDaresNone) }));
    await waitFor(() => expect(currentPathname()).toBe(listRoute));

    fireEvent.press(screen.getByRole('button', { name: copy.ownCards.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    expect(screen.getByRole('header', { name: copy.roundSetup.title })).toBeOnTheScreen();
  });

  it('should open straight from a deep link', async () => {
    await launchApp(listRoute);

    expect(currentPathname()).toBe(listRoute);
    expect(screen.getByRole('header', { name: copy.ownCards.listTitle })).toBeOnTheScreen();
  });

  it('should write a dare, list it, and show it on setup with the mix switch', async () => {
    await launchApp(setupRoute);
    fireEvent.press(screen.getByRole('button', { name: rowName(copy.roundSetup.myDaresNone) }));
    await waitFor(() => expect(currentPathname()).toBe(listRoute));

    await writeDare('Placeholder dare 1');

    expect(screen.getByRole('button', { name: 'Placeholder dare 1' })).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.ownCards.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    expect(
      screen.getByRole('button', {
        name: rowName(fillCopy(copy.roundSetup.myDaresCount, { count: 1 })),
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares, checked: true }),
    ).toBeOnTheScreen();
  });

  it('should open a dare for editing, and delete it from there', async () => {
    await launchApp(listRoute);
    await writeDare('Placeholder dare 1');

    fireEvent.press(screen.getByRole('button', { name: 'Placeholder dare 1' }));
    await waitFor(() => expect(currentPathname()).toMatch(/^\/games\/dares\/my-dares\/p-/));
    expect(screen.getByLabelText(copy.ownCards.fieldLabel)).toHaveDisplayValue(
      'Placeholder dare 1',
    );

    fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteButton }));
    fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteConfirm }));
    await act(async () => {});
    await waitFor(() => expect(currentPathname()).toBe(listRoute));

    expect(screen.getByText(copy.ownCards.emptyList)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Placeholder dare 1' })).not.toBeOnTheScreen();
  });

  it('should open the editor for a new dare straight from a deep link', async () => {
    await launchApp(newRoute);

    expect(currentPathname()).toBe(newRoute);
    expect(screen.getByLabelText(copy.ownCards.fieldLabel)).toBeOnTheScreen();
  });

  it('should send a link to a dare that is not there to the list', async () => {
    await launchApp('/games/dares/my-dares/p-00000000-0000-4000-8000-0000000000ff');

    await waitFor(() => expect(currentPathname()).toBe(listRoute));
  });
});
