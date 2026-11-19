# Secret match

- **Secret match is its own reducer** (FRK-37): Secret match is a reducer in `secretMatch.ts`, not part of the round engine. It has its own state, setup and actions, and takes the questions as an argument.
- **Revealed state holds matches only** (FRK-37): The revealed state is the phase, the matches and the item count. It holds no names and no ratings, so nothing is left to leak.
- **Stop at the reveal does nothing** (FRK-37): `stop` applies in a pass and at the handoff. Once the session is revealed it returns the same state, because the reveal is the end of the session and the screens leave it by navigating.
- **Short categories in a session** (FRK-37): When a category has too few items for its share, the others make it up, mild to bold, fresh items first, then avoided ones. The session only gets shorter when the whole pool is short.
- **Player names in the view** (FRK-37): The view gives the current player's name, and the handoff view names both players, so screens hold no state to look names up.
