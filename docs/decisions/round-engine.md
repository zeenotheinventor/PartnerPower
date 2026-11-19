# Round engine

- **Not this one is not a penalty** (FRK-14): Skipping a card and switching a category off cost no drink and count as no dare done, and the card number does not move. The ticket says nobody drinks, and the engine's `removeCard` and `disableCategory` already work that way.
- **Staging after a replacement** (FRK-14): A replacement card shows at once, with no step up or pass the phone screen, even in a higher category. The same player holds the phone, and the new cost is in the card's penalty line.
- **Switched off categories stay off** (FRK-14): A category already switched off shows in the sheet as off and locked, because the round has no action to switch one back on.
- **Surprise plan has its own generator** (FRK-43): The plan draws offsets and shuffles from a stream seeded from the round seed, so a round with surprises off deals exactly as before.
- **Stall rule** (FRK-43): A type with no eligible card for the rest of the round is dropped from the plan, so later blocks still get other types. A type that only does not fit this block, such as a jump at the top category, stays in the bag. Eligibility is checked against every enabled category, so it is conservative and never drops a type that could still fit.
- **Free pass is given when dealt** (FRK-43): The pass is held from the moment the card is dealt, so it can be used on that card or kept. A skip or a category switch-off drops the surprise but keeps the pass.
- **Free pass waits for a choice** (FRK-43): `useFreePass` does nothing on an open choice, as on an unflipped mystery, because the card is not yet known.
- **Timer surprise needs a solo card** (FRK-43): The timer surprise only deals a solo timer card, as every surprise goes on a solo card.
- **Turn moves only for the holder of the turn** (FRK-43): A solo card moves the turn only when the player who played it is the one whose turn it was. A swap does not move it, and a swap dropped by a skip still keeps the alternation.
- **Replacement keeps the player** (FRK-43): `removeCard` and `disableCategory` keep the player who held the phone, so a dropped swap card is still played by the swapped partner.
- **Mystery cost in the history** (FRK-43): A passed mystery is recorded with its surprise and `summarise` adds one to its penalty, so no extra field is needed.
