# Sounds

The button sounds are original. They are synthesised from sine waves by
`apps/mobile/scripts/generateSounds.mjs`, which has no dependencies, and the project owns them.
No third party audio is used, so there is no licence to record.

| File       | Used for                                                    | Length |
| ---------- | ----------------------------------------------------------- | ------ |
| `tap.wav`  | Every ordinary button                                       | 40 ms  |
| `done.wav` | The turn's done action, and the together card's "we did it" | 250 ms |
| `pass.wav` | The turn's pass action, and the together card's "we drink"  | 300 ms |

The files are 16-bit mono at 44.1 kHz, and their peak is kept low so a press is never loud.

## Alternatives

`alternatives/b` and `alternatives/c` hold two other versions of the same three sounds.

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
