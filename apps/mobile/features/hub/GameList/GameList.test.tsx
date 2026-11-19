import { copy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { GameList } from './GameList';
import type { ListedGame } from './types';

// None of these is a registered game, so the list is shown to work for any list it is given.
const madeUpGames: ListedGame[] = [
  {
    id: 'one',
    title: 'First game',
    description: 'About one',
    status: 'available',
    entryRoute: '/one',
  },
  {
    id: 'two',
    title: 'Second game',
    description: 'About two',
    status: 'comingSoon',
    entryRoute: '/two',
  },
  {
    id: 'three',
    title: 'Third game',
    description: 'About three',
    status: 'available',
    entryRoute: '/three',
  },
];

describe('GameList', () => {
  const onOpen = jest.fn();

  afterEach(() => onOpen.mockClear());

  it('should show one tile per game, in the order given', async () => {
    await renderThemed(<GameList games={madeUpGames} onOpen={onOpen} />);

    const tileNames = screen.getAllByRole('button').map((tile) => tile.props.accessibilityLabel);
    expect(tileNames).toEqual(['First game', `Second game, ${copy.hub.comingSoon}`, 'Third game']);
  });

  it('should show each description under its title', async () => {
    await renderThemed(<GameList games={madeUpGames} onOpen={onOpen} />);

    expect(screen.getByText('About one')).toBeOnTheScreen();
    expect(screen.getByText('About two')).toBeOnTheScreen();
    expect(screen.getByText('About three')).toBeOnTheScreen();
  });

  it('should open the setup route of an available game when its tile is pressed', async () => {
    await renderThemed(<GameList games={madeUpGames} onOpen={onOpen} />);

    fireEvent.press(screen.getByRole('button', { name: 'Third game' }));

    expect(onOpen).toHaveBeenCalledWith('/three');
  });

  it('should disable the tile of a coming soon game and open nothing when it is pressed', async () => {
    await renderThemed(<GameList games={madeUpGames} onOpen={onOpen} />);
    const tile = screen.getByRole('button', { name: `Second game, ${copy.hub.comingSoon}` });

    fireEvent.press(tile);

    expect(tile).toBeDisabled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('should show the coming soon marker only on a coming soon game', async () => {
    await renderThemed(<GameList games={madeUpGames} onOpen={onOpen} />);

    expect(screen.getAllByText(copy.hub.comingSoon)).toHaveLength(1);
  });

  it('should show no tiles for an empty list', async () => {
    await renderThemed(<GameList games={[]} onOpen={onOpen} />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
