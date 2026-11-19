# Questions

- **Format on the question** (FRK-34): A question carries its own `format` and a deck can hold any mix. The content package ships one file per format, and a test checks that each file holds only its own format.
- **Discovery date format** (FRK-34): An ISO date and time string, checked by the schema. Storage can keep it as text.
- **Pick formats keep the phone or pass it** (FRK-35): `eitherOr` keeps the phone between picks and `guess` passes it, as the design decides. The engine does not model the passing: `stage` moves from `answering` to `secondPick` in both and the screen shows the handoff.
- **Answers use the player index** (FRK-35): `answer` takes a yes or no per player index, not per role, so the same action works whichever player holds the phone.
- **Where a played question is counted** (FRK-35): A question joins the history when it is revealed, so ending the round at the reveal keeps it, and a question the round ended on before the reveal is not counted.
- **Removing a revealed question** (FRK-35): `removeQuestion` does nothing once revealed, because the drinks and the discovery are already recorded. Switching a category off at the reveal leaves the revealed question in place.
- **Fallback order for questions** (FRK-35): The chosen format is tried first in each category, then the other enabled formats, as the ticket says. This differs from dares, which tries the preferred kind in every category before the other kind.
- **Knows best after only wrong guesses** (FRK-35): `knowsBest` is `'tie'` when guess questions were played and both players have the same number right, even zero. It is null only when no guess question was played.
- **Duplicate ids in the question list** (FRK-35): The engine deals the first question of an id and ignores the rest, so a repeated id cannot be dealt twice.
- **Screens read a turn view** (FRK-35): `questionTurnView` leaves the holder's first pick out and adds `pickLocked`, so a pick screen cannot show a private pick by reading state it should not. The pick appears only in the reveal.
- **Pacing is shared** (FRK-35): `round.ts` imports the pacing helpers and the player share draw from `pacing.ts`, with the dares deal baseline unchanged.
- **Format and topic choices are not kept** (FRK-60): Like level and length, they reset each visit. Only the names are remembered.
