# Privacy

- **Error reporting and analytics** (FRK-56): None at launch. No SDK for either in the app. Crash data comes only from what Apple and Google collect from players who opt in.
- **Encryption export answer** (FRK-56): `ITSAppUsesNonExemptEncryption` is `YES` now that SQLCipher ships (FRK-41), as an industry standard algorithm not provided by the operating system. The owner files the French declaration or leaves France out of the launch countries. FRK-58 sets the flag in the iOS config. `docs/compliance.md` gives the reasons.
- **No error reporting or analytics SDK** (FRK-58): None ships, as the compliance review requires. The only network call is the update check.
- **Export compliance flag** (FRK-58): `ITSAppUsesNonExemptEncryption` is `true`, set in `ios.infoPlist`, as `docs/compliance.md` concludes now that SQLCipher ships. The owner files the French declaration or leaves France out.
