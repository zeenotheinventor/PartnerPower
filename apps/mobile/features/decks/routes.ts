import { setupRoute } from '../ownCards/routes';

export const deckPickerRoute = '/games/dares/decks';
export const favouritesRoute = '/games/dares/decks/favourites';
export const newDeckRoute = '/games/dares/decks/new';

export const customDeckRoute = (id: string) => `/games/dares/decks/${id}`;

/** The route param that setup reads once, to open with Your matches chosen. */
export const matchesDeckParam = 'matches';
/** Opens Freak or Drink setup with Your matches chosen. */
export const matchesSetupRoute = `${setupRoute}?deck=${matchesDeckParam}`;
