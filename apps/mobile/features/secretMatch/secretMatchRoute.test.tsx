// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, displayNames, fillCopy } from '@getfreak/content';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { router } from 'expo-router';

const homeRoute = '/games/questions';
const matchRoute = '/games/questions/match';
const discoveriesRoute = '/games/questions/discoveries';

const pressButton = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

async function startSession() {
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), 'Player A');
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), 'Player B');
  pressButton(copy.secretMatch.start);
  await act(async () => {});
}

function rateAll(rating: 'yes' | 'maybe' | 'no') {
  for (let count = 0; count < 12; count += 1) pressButton(copy.secretMatch[rating]);
}

// Plays both passes with a yes for every item, which ends on the reveal.
async function playToReveal() {
  await launchApp(matchRoute);
  await startSession();
  rateAll('yes');
  pressButton(fillCopy(copy.secretMatch.handoffButton, { partner: 'Player B' }));
  rateAll('yes');
  await act(async () => {});
}

describe('secret match in the route tree', () => {
  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  it('should open from the Drink If home and go back to it', async () => {
    await launchApp('/');
    pressButton(displayNames.questions.title);
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));

    pressButton(copy.questionsHome.matchTitle);
    await waitFor(() => expect(currentPathname()).toBe(matchRoute));
    expect(screen.getByRole('header', { name: copy.secretMatch.title })).toBeOnTheScreen();

    pressButton(copy.secretMatch.backLabel);
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
    expect(screen.getByRole('header', { name: copy.questionsHome.title })).toBeOnTheScreen();
  });

  it('should fall back to the home from the intro opened by a deep link', async () => {
    await launchApp(matchRoute);

    pressButton(copy.secretMatch.backLabel);
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));

    expect(screen.getByRole('header', { name: copy.questionsHome.title })).toBeOnTheScreen();
  });

  it('should play both passes with the shipped items, reveal the matches and leave with Done', async () => {
    await launchApp(matchRoute);
    await startSession();

    expect(
      screen.getByRole('header', { name: fillCopy(copy.secretMatch.passOf, { name: 'Player A' }) }),
    ).toBeOnTheScreen();
    rateAll('yes');
    expect(
      screen.getByRole('header', {
        name: fillCopy(copy.secretMatch.handoffTitle, { name: 'Player A', partner: 'Player B' }),
      }),
    ).toBeOnTheScreen();
    pressButton(fillCopy(copy.secretMatch.handoffButton, { partner: 'Player B' }));
    rateAll('yes');
    await act(async () => {});

    expect(screen.getByRole('header', { name: copy.secretMatch.revealTitle })).toBeOnTheScreen();
    expect(
      screen.getByText(fillCopy(copy.secretMatch.revealCountMany, { count: 12, total: 12 })),
    ).toBeOnTheScreen();
    expect(screen.getByText(copy.secretMatch.saved)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: copy.secretMatch.daresTitle })).toBeOnTheScreen();

    pressButton(copy.secretMatch.done);
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
  });

  it('should open Discoveries from the dares for you two card on the reveal', async () => {
    await playToReveal();

    pressButton(copy.secretMatch.daresTitle);
    await waitFor(() => expect(currentPathname()).toBe(discoveriesRoute));

    expect(screen.getByRole('header', { name: copy.discoveries.title })).toBeOnTheScreen();
  });

  it('should open the stop dialog from the system back, and return to the home on confirming', async () => {
    await launchApp('/');
    pressButton(displayNames.questions.title);
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
    pressButton(copy.questionsHome.matchTitle);
    await waitFor(() => expect(currentPathname()).toBe(matchRoute));
    await startSession();

    act(() => router.back());

    expect(currentPathname()).toBe(matchRoute);
    const dialog = screen.getByLabelText(copy.secretMatch.stopTitle);
    fireEvent.press(within(dialog).getByRole('button', { name: copy.secretMatch.stopConfirm }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
    expect(screen.getByRole('header', { name: copy.questionsHome.title })).toBeOnTheScreen();
  });

  it('should return to the home from the Stop pill after confirming, and keep nothing', async () => {
    await launchApp('/');
    pressButton(displayNames.questions.title);
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
    pressButton(copy.questionsHome.matchTitle);
    await waitFor(() => expect(currentPathname()).toBe(matchRoute));
    await startSession();
    pressButton(copy.secretMatch.yes);

    pressButton(copy.secretMatch.stop);
    fireEvent.press(
      within(screen.getByLabelText(copy.secretMatch.stopTitle)).getByRole('button', {
        name: copy.secretMatch.stopConfirm,
      }),
    );
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));

    // Opening it again starts from the intro, so the session was discarded.
    pressButton(copy.questionsHome.matchTitle);
    await waitFor(() => expect(currentPathname()).toBe(matchRoute));
    expect(screen.getByRole('button', { name: copy.secretMatch.start })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: copy.secretMatch.yes })).not.toBeOnTheScreen();
  });

  it('should open the stop dialog from the system back at the handoff', async () => {
    await launchApp('/');
    pressButton(displayNames.questions.title);
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
    pressButton(copy.questionsHome.matchTitle);
    await waitFor(() => expect(currentPathname()).toBe(matchRoute));
    await startSession();
    rateAll('yes');

    act(() => router.back());

    expect(currentPathname()).toBe(matchRoute);
    expect(screen.getByLabelText(copy.secretMatch.stopTitle)).toBeOnTheScreen();
  });

  it('should let the system back leave the intro with nothing to stop', async () => {
    await launchApp('/');
    pressButton(displayNames.questions.title);
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
    pressButton(copy.questionsHome.matchTitle);
    await waitFor(() => expect(currentPathname()).toBe(matchRoute));

    act(() => router.back());

    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
  });
});
