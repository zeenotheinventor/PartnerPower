// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, fillCopy } from '@getfreak/content';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

const homeRoute = '/games/questions';
const listRoute = '/games/questions/my-questions';
const newRoute = '/games/questions/my-questions/new';

const homeEntryName = (count: string) =>
  fillCopy(copy.questionsHome.entryLabel, { title: copy.questionsHome.ownTitle, count });

async function pressSave() {
  fireEvent.press(screen.getByRole('button', { name: copy.ownQuestions.save }));
  await act(async () => {});
}

// Writes one question from the list, which is open, and ends on the list again.
async function writeQuestion(text: string) {
  fireEvent.press(screen.getByRole('button', { name: copy.ownQuestions.add }));
  await waitFor(() => expect(currentPathname()).toBe(newRoute));
  fireEvent.changeText(screen.getByLabelText(copy.ownQuestions.textLabel), text);
  await pressSave();
  await waitFor(() => expect(currentPathname()).toBe(listRoute));
}

describe('your questions in the route tree', () => {
  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  it('should open the list from the Your questions entry on the Drink If home', async () => {
    await launchApp(homeRoute);

    fireEvent.press(
      await screen.findByRole('button', { name: homeEntryName(copy.questionsHome.ownNone) }),
    );
    await waitFor(() => expect(currentPathname()).toBe(listRoute));

    expect(screen.getByRole('header', { name: copy.ownQuestions.title })).toBeOnTheScreen();
    expect(screen.getByText(copy.ownQuestions.empty)).toBeOnTheScreen();
  });

  it('should go back from the list to the Drink If home', async () => {
    await launchApp(homeRoute);
    fireEvent.press(
      await screen.findByRole('button', { name: homeEntryName(copy.questionsHome.ownNone) }),
    );
    await waitFor(() => expect(currentPathname()).toBe(listRoute));

    fireEvent.press(screen.getByRole('button', { name: copy.ownQuestions.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));

    expect(screen.getByRole('header', { name: copy.questionsHome.title })).toBeOnTheScreen();
  });

  it('should open straight from a deep link, and fall back to the home', async () => {
    await launchApp(listRoute);
    expect(currentPathname()).toBe(listRoute);

    fireEvent.press(screen.getByRole('button', { name: copy.ownQuestions.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
  });

  it('should write a question, list it, and count it on the home', async () => {
    await launchApp(listRoute);
    await writeQuestion('Placeholder question 1');

    expect(
      screen.getByRole('button', { name: `${copy.questionLeads.ifYou} Placeholder question 1` }),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.ownQuestions.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));

    expect(
      screen.getByRole('button', {
        name: homeEntryName(fillCopy(copy.questionsHome.ownCount, { count: 1 })),
      }),
    ).toBeOnTheScreen();
  });

  it('should open a question for editing, and delete it from there', async () => {
    await launchApp(listRoute);
    await writeQuestion('Placeholder question 1');

    fireEvent.press(
      screen.getByRole('button', { name: `${copy.questionLeads.ifYou} Placeholder question 1` }),
    );
    await waitFor(() =>
      expect(currentPathname()).toMatch(/^\/games\/questions\/my-questions\/pq-/),
    );
    expect(screen.getByLabelText(copy.ownQuestions.textLabel)).toHaveDisplayValue(
      'Placeholder question 1',
    );

    fireEvent.press(screen.getByRole('button', { name: copy.ownQuestions.delete }));
    fireEvent.press(screen.getByRole('button', { name: copy.ownQuestions.deleteConfirm }));
    await act(async () => {});
    await waitFor(() => expect(currentPathname()).toBe(listRoute));

    expect(screen.getByText(copy.ownQuestions.empty)).toBeOnTheScreen();
  });

  it('should open the editor for a new question straight from a deep link', async () => {
    await launchApp(newRoute);

    expect(currentPathname()).toBe(newRoute);
    expect(screen.getByLabelText(copy.ownQuestions.textLabel)).toBeOnTheScreen();
  });

  it('should send a link to a question that is not there to the list', async () => {
    await launchApp('/games/questions/my-questions/pq-00000000-0000-4000-8000-0000000000ff');

    await waitFor(() => expect(currentPathname()).toBe(listRoute));
  });

  it('should send a player who has not confirmed to the welcome screen instead of the list', async () => {
    await backend.clear();

    await launchApp(listRoute);

    expect(currentPathname()).toBe('/welcome');
  });
});
