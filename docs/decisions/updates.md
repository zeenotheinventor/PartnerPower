# Updates

- **Runtime version policy** (FRK-80): `fingerprint`, a hash of the native parts of the project that EAS computes, so a native change moves it with no manual step and an update never reaches a build with different native code. `appVersion` was rejected, because a forgotten `version` bump would ship JavaScript to phones with different native code and crash them.
- **When an update applies** (FRK-80): Check on launch, download in the background, run from the next cold start (`ON_LOAD`, timeout 0). The app never reloads while in use, so a round is never cut off.
- **Update failures** (FRK-80): Silent. The app keeps its version and nothing is logged.
- **When the update toast shows** (FRK-80): On a launch that is not embedded, when the running update id differs from the stored `lastShownUpdateId`. Never on a fresh install or the installed build. The id is stored when the toast is decided, so a launch that is closed early still counts as told.
- **Toast placement and dismissal** (FRK-80): A kit component at the bottom, over every screen, from the root layout. About 3 seconds, tap to dismiss, polite live region, announced on iOS, no fade with reduce motion.
- **Over-the-air network call** (FRK-80): The update check is the app's first network call. See Privacy.
- **Toast fade style** (FRK-80): The Toast's Animated `{ opacity }` is the one non-test `style=` outside Reanimated animated styles. An `Animated.Value` is a runtime value that a class cannot express, and it is not a CSS value from a token.
