# Content

- **For your partner means a solo card** (FRK-39): A player-written dare marked for your partner is a `solo` card, dealt to whoever's turn it is, as FRK-8 defines a card for one partner. Addressing a dare to one named partner is a separate product question.
- **Same base rules, different editorial rules** (FRK-39): Player text follows the same length and repeat rules as shipped text, through `checkCardText`. The house style rules stay on shipped cards, because a couple writing for themselves know who they are.
- **Duplicates checked against shipped text** (FRK-39): A player cannot add a card the deck already has.
- **Mixing ratio of one half** (FRK-39): With 30 or more shipped cards per category, a plain shuffle would rarely deal a couple's own dares in a 10 card round. One half shows them without crowding out the deck.
- **Timer cards are surprise only** (FRK-39): They are written to last the timer, so a normal deal would show them without a clock.
- **Shipped timer cards run 15 to 60 seconds** (FRK-46): FRK-46 sets the shipped range, tighter than the schema's 5 to 120, rising with the category. The schema stays wide for custom decks.
- **Limits live in `cardText.ts`** (FRK-39): The limits are one `limits` constant, next to the text rules that use the card length. `contentModel.ts` imports it, so no module imports in a circle.
- **Player card text is stored tidied** (FRK-39): `playerCardSchema` tidies the text, then checks it, so what is stored is what was checked.
- **Alternative forfeit mode** (FRK-16): None at launch: no drink cap and no non-alcoholic mode, decided by the owner on 2026-11-18. `docs/compliance.md` lists the options if a store objects to the drink forfeit.
- **Tags are plain strings in `core`** (FRK-40): `core` cannot import `content`, so a card holds 1 to 3 strings and `content` checks them against `interestTags` when it loads its data.
- **One shared tag schema** (FRK-40): Cards and secret match items share one `tagsSchema` (1 to 3 non-empty tags). It is optional on a card and required on a secret match item.
- **Suggestions return dares, not scores** (FRK-40): `suggestDares` returns the ranked cards. The score is an implementation detail of the ranking, so the screen does not depend on it.
- **Timer cards are suggested like any dare** (FRK-40): A shipped timer card carries tags and is ranked with the rest. The caller filters with `options.categories` or beforehand if a game needs fewer.
- **Matches deck limits** (FRK-40): Up to 20 cards, offered at 5 or more suggestions, as constants in `core`. A smaller deck is still valid, so `buildMatchesDeck` does not refuse.
- **Placeholder secret match tags** (FRK-40): The 12 existing items took the nearest tags in the vocabulary. The secret match content ticket rewrites them.
- **Secret match library has 70 items, no new tags** (FRK-48): 16 Soft, 16 Foreplay, 18 Oral and 20 Sex, with at least 2 in every topic of every category. The 29 tags already cover the items, so the vocabulary is unchanged. This replaces the FRK-40 placeholder items.
- **Topic t5 is the couple's own history** (FRK-48): History items are about moments the two of them shared, such as recreating a first date. They never mention a past partner or anyone outside the couple.
- **No hyphens in item text** (FRK-48): Following the house style for shipped cards, an item says "Sixty nine" with no hyphen, while the tag stays `sixty-nine`. The test rejects any hyphen in item text.
