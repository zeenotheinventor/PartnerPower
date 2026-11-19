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
