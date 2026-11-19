# Project setup

- **Expo SDK 57 or 58** (FRK-1): Stay on SDK 57 (React Native 0.86), as the milestone brief specifies. SDK 58 is current, so plan an upgrade once the app is playable.
- **Node version** (FRK-1): Node 26, the active long-term support line, decided by the owner on 2026-11-18. Node 24 is the fallback if a dependency fails on 26.
- **App name and identifiers** (FRK-1): The app is Get Freak: display name `Get Freak`, slug `get-freak`, scheme `getfreak`, store id `com.sojisoft.getfreak`, packages `@getfreak/*`. Decided by the owner on 2026-11-18.
- **The app icon is discreet** (FRK-19): Two fanned cards, a heart and a sparkle in the token colours, with no words and no explicit imagery. It suits a 4+ audience under Apple guideline 2.3.8.
- **react-native-svg, a new native module** (FRK-18): Installed with `expo install` for SDK 57. It needs a new native build, and an existing development client cannot show a character until it is rebuilt.
