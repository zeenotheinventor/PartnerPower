import { GameTile } from '../GameTile';
import type { GameListProps } from './types';

// This knows nothing about any particular game. It shows a tile for each game it is given.
export function GameList({ games, onOpen }: GameListProps) {
  return games.map((game) => (
    <GameTile
      key={game.id}
      title={game.title}
      description={game.description}
      status={game.status}
      decoration={game.decoration}
      onPress={() => onOpen(game.entryRoute)}
    />
  ));
}
