# Press feedback and effects

- **Press feedback libraries** (FRK-26): `expo-audio` and `expo-haptics`, installed with `expo install` for SDK 57. Both need a new native build.
- **Button sounds are generated** (FRK-26): The three sounds are synthesised by `scripts/generateSounds.mjs`, so they are original and the project owns them, with no licence to record. Variant A ships, and two alternatives sit in `assets/sounds/alternatives` for the owner to swap in.
- **Audio session** (FRK-26): Mix with other audio and respect the iOS silent switch, so a sound never stops or lowers music. The `expo-audio` plugin adds no microphone or background permissions.
- **Where press feedback lives** (FRK-26): A top level `feedback` module beside `settings` and `storage`, not under `features`, because the UI kit `Button` depends on it and the kit should not import from a feature.
- **Button feedback option** (FRK-26): `Button` has one `feedback` prop, `tap`, `done`, `pass` or `none`, that picks the sound and the haptic together. They are not set apart, so a moment never has a sound with the wrong haptic. Only the kit `Button` gives feedback.
- **Feedback with no provider** (FRK-26): Calls do nothing, so a component renders alone. The route tests prove the real root layout wires the provider.
- **Android haptics** (FRK-28): The view haptic effects, not the vibrator, so the phone's touch feedback setting is respected and no permission is needed. iOS uses its system generators, which follow System Haptics.
- **Round complete haptic** (FRK-28): A run of four pulses over about half a second, fired once from the summary screen when it first shows. The summary is where both ways of ending a round meet, so one guard gives once only.
- **Press effects library** (FRK-27): `react-native-reanimated`, already installed, with plain views for every shape. No svg, Rive or other native dependency for the effect.
- **Where press effects are drawn** (FRK-27): A layer in `RoundPlayScreen`, not in the button, because answering replaces the buttons. The button is measured before the answer is sent, and the answer never waits for it.
- **Style prop for animated styles** (FRK-27): `Animated.View style={animatedStyle}` is the one allowed `style`. It holds transform, opacity and the measured origin and ring size. Colours, sizes and radii stay in token classes.
- **One press effect at a time** (FRK-27): The design said to let two run. The ticket says effects must not stack, so a new press replaces the one playing, by remounting the layer with a new key.
- **Motion constants** (FRK-27): Durations, easings, angles, distances and particle tables are typed constants in `pressEffect/motion.ts`, the seed for a `motion` token group if more motion arrives.
- **Reduce motion effect** (FRK-27): No particles are mounted. A fade only ring sits 8 dp outside the button, 400 ms for Done and 480 ms for Pass, with `ReduceMotion.Never` so Reanimated does not skip it.
- **Reanimated under Jest** (FRK-27): `jest.setup.js` uses the worklets and Reanimated mocks, where an animation jumps to its end, so tests check what is mounted. `useReducedMotion` is a Jest mock. A spy on `withTiming` covers the ignored `reduceMotion` option.
- **Effect layer test ids** (FRK-27): The layer is decoration with no role or name and is hidden from screen readers, so tests find it by test id with hidden elements included. This is the one case where a test id is the right query.
- **Effect not in the kit gallery** (FRK-27): The layer belongs to the play screen and is not a reusable kit component, so it has no gallery entry.
- **Timer end haptic** (FRK-50): A fifth moment, `timerEnd`, with a haptic and no sound, in the way of `roundComplete`. One heavy impact on iOS and one long press effect on Android, a single pulse no press uses. The countdown ending is the only place it is played, and the haptics switch and the phone's own setting decide whether it is felt.
