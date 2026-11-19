# Screens

- **Entry guard mechanism** (FRK-6): Protected groups on a navigator that stays mounted, plus a test over the real route files. A redirect in place of the navigator was tried and rejected: it looped on a deep link with the app open and re-read the settings on every flip.
- **Declining the entry confirmation** (FRK-6): Not stored, so the question is asked again at the next launch. The closing screen has a way back to the question.
- **A failed write when confirming** (FRK-6): The player is let in for that session and asked again at the next launch, so a storage fault does not lock them out.
- **Built-in sitemap route** (FRK-6): Turned off in `app.json`, because it sits outside the entry guard.
- **Game tiles on the hub** (FRK-7): Both tiles are surface-coloured cards. The design fills the available game's tile with the accent colour and puts small text on it, which fails the rule that text on the accent is large and bold.
- **Round setup before its ticket** (FRK-7): The available game's tile opens a stand-in round setup screen, so the hub works end to end. The real screen replaces it in FRK-11.
- **Sheet frame, skip row** (FRK-14): The design gives the skip row a 3px hard shadow and a 16px title. There is no shadow token, so the row has a plain border, and the title uses the 20px heading style, the nearest on the type scale.
- **Sheet frame, shape and spacing** (FRK-14): The design's 26, 14, 5 and 9px values use the nearest scale values: 24, 16, 4 and 12px. Its scrim is a fixed dark colour, and the build uses the background at 80%, as the end round dialog does.
- **Sheet frame, quiet control** (FRK-14): The design's 13px link text uses the 12px caption style, with a 48px touch area around it.
- **Sheet frame, last category hint** (FRK-14): The design's sheet has no hint line. The sheet shows the setup hint when one category is left on, so the lock has a visible reason as well as a spoken one.
- **Drink If has a home screen** (FRK-60): Unlike Freak or Drink it has four places to go, so the hub tile opens a home and the home opens setup. Secret match is a separate session from a round, because it needs two private passes.
- **`GameEntry` has an `entryRoute`** (FRK-60): The field was `setupRoute`. It is renamed because a tile now opens a game's home as well as its setup. No registered game is coming soon now, so the hub tests cover that state through the game list.
- **Entries switch on by a route** (FRK-60): `homeEntries` gives each entry a `route`, null while coming soon, so a later ticket changes one line.
- **Home shows the returning line** (FRK-60): Nothing records a first visit yet, so the home always shows the line for a return visit. The first visit line is not in `content` until something can choose it. Counts on Discoveries and Your questions wait for their hooks.
- **Format and topic switches share a card** (FRK-60): Each group is one `Card` with `grouped={false}`, so a screen reader reaches each switch, and rows are split by a border. Static cards are otherwise one accessible group.
- **Drink If play is a stand-in** (FRK-60): A header and one line, with a way back to setup, until the play ticket replaces it. It does not read the round.
