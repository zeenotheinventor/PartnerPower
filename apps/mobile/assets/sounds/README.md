# Sounds

The sounds are original. They are synthesised from sine waves by
`apps/mobile/scripts/generateSounds.mjs`, which has no dependencies, and the project owns them.
No third party audio is used, so there is no licence to record.

Every sound is preloaded when the app starts, so the first press has no delay. A press sound is
under 120 ms and the round jingle is under 1.2 s. The scheduling of game moments after a press is in
`docs/architecture.md`, under Press feedback.

| File                | Used for                                                            | Length  |
| ------------------- | ------------------------------------------------------------------- | ------- |
| `tap.wav`           | Every ordinary button, pressable card and chip                      | 40 ms   |
| `done.wav`          | The turn's done action, and the together card's "we did it"         | 250 ms  |
| `pass.wav`          | The turn's pass action, and the together card's "we drink"          | 300 ms  |
| `toggleOn.wav`      | A switch turned on. Two rising blips                                | 110 ms  |
| `toggleOff.wav`     | A switch turned off. Two falling blips                              | 110 ms  |
| `select.wav`        | Choosing an option in a segmented control. Two quick rising ticks   | 80 ms   |
| `back.wav`          | The back button. One soft, low, falling blip                        | 90 ms   |
| `locked.wav`        | A press on a locked or disabled control. Two short low notes        | 110 ms  |
| `deal.wav`          | A new card showing. Three quick rising ticks                        | 200 ms  |
| `stepUp.wav`        | The step up screen showing. A bright rising arpeggio                | 500 ms  |
| `handover.wav`      | The pass the phone screen showing. A two note ding dong             | 550 ms  |
| `sheetOpen.wav`     | The Not this one sheet or the end round dialog opening. A soft rise | 200 ms  |
| `timerEnd.wav`      | A timer card's countdown ending. Three bright bell dings            | 700 ms  |
| `roundComplete.wav` | The round summary showing. Four rising notes and a held chord       | 1150 ms |

The files are 16-bit mono at 44.1 kHz, and their peak is kept low so a press is never loud.

## Alternatives

`alternatives/b` and `alternatives/c` hold two other versions of tap, done and pass. The other
sounds have no alternatives.

- A, in this folder: soft and round.
- B: woody and warm. A lower tap, a done chime a fifth apart, and one long falling pass.
- C: bright and glassy. A higher tick, a brighter chime, and three quick falling blips for pass.

To switch to one, run this from `apps/mobile` and commit the changed files:

```
node scripts/generateSounds.mjs --variant b
```

To listen to a variant without changing anything, write it to another folder:

```
node scripts/generateSounds.mjs --variant c --out /tmp/sounds
```

A run with no flags rewrites variant A here and both alternatives. The output is the same every
time, so there is nothing to review but the numbers in the script.
