# Store compliance

This is the review of Get Freak against the App Store and Google Play rules, written before anything
is submitted. It holds every answer the owner types into the store consoles: the age rating
questionnaires, the privacy label, the data safety form, the export compliance answer, the listing
text and the App Review notes.

Get Freak is an 18+ app of games for couples, played together on one phone. It has no accounts, no
server, no analytics, no error reporting and no network calls.

- Written for FRK-56 on 19 November 2026. Every rule below was checked on that date at the source
  given. Store rules change, so check the sources again before each submission.
- Where a fact could not be confirmed from a primary source, it is marked **Unconfirmed**.
- It describes the starter deck and the libraries on `main` at 182b44a, after FRK-30 (Oral and Sex),
  FRK-44 (Foreplay), FRK-26 (sounds) and FRK-28 (haptics) merged.
- It feeds FRK-58 (the encryption answer and permissions), FRK-63 (the privacy policy text), FRK-73
  (the questionnaires and the listings) and FRK-74 (the review notes).
- Change it in the same pull request as anything that changes an answer: a new library, a network
  call, a new kind of stored data, a purchase, or a change to the deck that moves its content up or
  down.

## Summary

### Expected ratings

| Store       | Expected rating                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| App Store   | 18+, calculated from the answers below. No override needed.                                                                     |
| Google Play | IARC 18+, PEGI 18, USK 18, ClassInd 18, and ESRB Mature 17+ or Adults Only 18+. **Unconfirmed** until the questionnaire is run. |

Target audience on Google Play: 18 and over only.

### Top risks

| #   | Risk                                                                                                                                                                                                | Likelihood                                  | Mitigation                                                                                                                          | If review objects                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Google Play rejects or removes the app for sexual content. Its policy has no adult exception and names "explicit text" in the app and "sex guides".                                                 | High                                        | Text only, no images. 18+ rating and target audience. Clean listing. Couples framing. Learn the outcome early from the closed test. | Soften the deck on Android, or ship Android with Soft only. See [Explicit dares](#explicit-dares).                |
| 2   | App Review rejects the app under 1.1.4, or reads the explicit cards as "Graphic Sexual Content", which makes an app Unrated and unpublishable on the App Store.                                     | Medium to high                              | Text only, no images, no narrative. 18+ rating. 18+ confirmation. Couples and consent framing. Full disclosure in the review notes. | Same deck options as risk 1, for iOS.                                                                             |
| 3   | Apple 1.4.3 or Google's alcohol rule: the forfeit is drinks, 1 to 4 per pass, with no cap. Passing every card of a 20 card Freaky round costs each player 30 drinks (worked example under Alcohol). | Medium                                      | Any card can be skipped at no cost. The winner is whoever did more dares, never whoever drank more. Clean listing.                  | Call the unit a sip, add a responsible drinking line on the 18+ screen, or add a cap. Copy and data, little code. |
| 4   | Apple 4.3(b) names "drinking games" and "Kama Sutra" apps as low value.                                                                                                                             | Medium                                      | Two games, a curated deck of 128 cards, the couple's own dares and decks, the lock, the design. Say so in the notes.                | Answer in Resolution Center with what sets the app apart. No code change helps directly.                          |
| 5   | The vibration card reads as the phone being used as a vibrator (Apple), or as "functionally sexual aids" (Google).                                                                                  | Medium on Apple, high on Google             | One card in the deck. Described in the notes, kept out of the listing and screenshots.                                              | Take the card out of the deck (a data change) and resubmit.                                                       |
| 6   | US state app store age laws. Texas is in force. Apple says an 18+ app still needs the Declared Age Range API where the law requires it.                                                             | Likely for Texas accounts, duties unsettled | Not built yet. Needs a new ticket before a US launch. See [Age assurance](#age-assurance).                                          | Not a review risk as such. A legal risk.                                                                          |

## Sources

All checked on 19 November 2026.

| Id  | Source                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | App Review Guidelines, page marked "Last Updated: October 16, 2026": https://developer.apple.com/app-store/review/guidelines/                                                                                              |
| A2  | Age ratings values and definitions: https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/                                                                       |
| A3  | Set an app age rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/                                                                                                    |
| A4  | Updated age ratings in App Store Connect, 24 July 2025: https://developer.apple.com/news/?id=ks775ehf                                                                                                                      |
| A5  | App privacy details: https://developer.apple.com/app-store/app-privacy-details/                                                                                                                                            |
| A6  | Complying with encryption export regulations: https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations                                                                              |
| A7  | Overview of export compliance: https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/                                                                                    |
| A8  | Export compliance documentation for encryption: https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/                                               |
| A9  | Declared Age Range: https://developer.apple.com/documentation/declaredagerange                                                                                                                                             |
| A10 | Age assurance developer Q&A: https://developer.apple.com/support/age-assurance/                                                                                                                                            |
| A11 | New requirements for apps available in Texas, 8 October 2025: https://developer.apple.com/news/?id=btkirlj8                                                                                                                |
| A12 | Next steps for apps distributed in Texas, 4 November 2025: https://developer.apple.com/news/?id=2ezb6jhj                                                                                                                   |
| A13 | App information (name and subtitle limits): https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/                                                                                  |
| A14 | Platform version information (description, keywords, promotional text): https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/                                         |
| G1  | Inappropriate content policy (sexual content, alcohol): https://support.google.com/googleplay/android-developer/answer/9878810                                                                                             |
| G2  | Content ratings: https://support.google.com/googleplay/android-developer/answer/9898843                                                                                                                                    |
| G3  | Content rating questionnaire and rating authorities: https://support.google.com/googleplay/android-developer/answer/188189                                                                                                 |
| G4  | Metadata policy: https://support.google.com/googleplay/android-developer/answer/9898842                                                                                                                                    |
| G5  | Data safety section: https://support.google.com/googleplay/android-developer/answer/10787469                                                                                                                               |
| G6  | Store listing text limits: https://support.google.com/googleplay/android-developer/answer/9859152                                                                                                                          |
| G7  | Policy enforcement (rejection, removal, suspension, strikes): https://support.google.com/googleplay/android-developer/answer/9899234                                                                                       |
| G8  | Play Age Signals API overview: https://developer.android.com/google/play/age-signals/overview                                                                                                                              |
| G9  | Play Console help on US state age laws: https://support.google.com/googleplay/android-developer/answer/16569691                                                                                                            |
| I1  | IARC ratings guide: https://www.globalratings.com/ratingsguide.aspx                                                                                                                                                        |
| E1  | Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/                                                                                                                                                             |
| E2  | Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/                                                                                                                                                   |
| E3  | Expo privacy manifests: https://docs.expo.dev/guides/apple-privacy/                                                                                                                                                        |
| E4  | `expo-sqlite` 57.0.5 build files in this repository's `node_modules`: `ios/ExpoSQLite.podspec`, `android/build.gradle`, `android/CMakeLists.txt`                                                                           |
| E5  | `expo-dev-launcher` README (version 56): https://cdn.jsdelivr.net/npm/expo-dev-launcher@56.0.18/README.md                                                                                                                  |
| Z1  | Zetetic (SQLCipher) forum, export requirements: https://discuss.zetetic.net/t/export-requirements-for-applications-using-sqlcipher/47                                                                                      |
| L1  | Texas SB 2420 tracker, checked by its authors through 13 October 2026 (secondary): https://texasdatalaw.com/tracker/sb-2420/                                                                                               |
| L2  | Search result summaries on Utah and Louisiana (secondary, not read in full): https://betanews.com/article/google-play-age-signals-api-global-rollout/ and https://magist.io/regulations/louisiana-app-store-accountability |

## The app as reviewed

- **Games.** `dares` ("Freak or Drink") is playable. `questions` ("Drink If") shows on the home
  screen as coming soon and is planned for milestone 5.
- **Deck.** 128 cards in four categories of 32, each with 23 solo and 9 together cards. Text only.
  No images, video or audio of any sexual kind.
- **Levels.** Flirty deals Soft only. Spicy adds Foreplay. Freaky adds Oral and Sex. Since FRK-44,
  Spicy already reaches explicit cards, so only Flirty is mild.
- **What the categories contain.**
  - Soft: compliments, eye contact, kisses on the face and hands, hugs, massages over clothes.
  - Foreplay (FRK-44): undressing, the couple naked together, kissing and sucking nipples, touching
    over and inside underwear (21 cards mention underwear), touching each other's genitals by hand,
    grinding. One card names genitals with slang words.
  - Oral (FRK-30): oral sex, described plainly, including positions, timing and pace. Three cards
    name genitals with slang words.
  - Sex (FRK-30): intercourse in named positions, toys (two cards), talking dirty, a blindfold and
    holding a partner's wrists (each with a line that either partner can stop).
- **Consent.** Many cards say either partner can stop. "Not this one" skips any card at no cost and
  can switch a category off for the rest of the round.
- **Forfeit.** Passing a card costs drinks: 1 for Soft, 2 for Foreplay, 3 for Oral, 4 for Sex.
  Passing a together card costs both players. There is no cap and no non-alcoholic mode (owner,
  2026-11-18, FRK-16). The summary counts dares done and drinks, and names the player with more
  dares done as the boldest. Drinks never decide the winner.
- **Planned before launch.** The vibration card (FRK-29), the couple's own dares, favourites and
  decks in an encrypted store (milestone 3), the app lock, the weekly reminder, Settings with the
  privacy policy and Clear everything (milestone 4), and possibly a one-time purchase (FRK-42).
  Player-written questions and saved answers come with milestone 5.

## App Store rules that apply

Quotes are from A1 unless another source is named.

| Rule          | What it says                                                                                                                                                                                               | Risk for Get Freak                                                      | What the app does                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1.4         | Rejects "overtly sexual or pornographic material", defined as "explicit descriptions or displays of sexual organs or activities intended to stimulate erotic rather than aesthetic or emotional feelings." | High. The Foreplay, Oral and Sex cards describe sexual acts explicitly. | See [Explicit dares](#explicit-dares).                                                                                               |
| 1.4.3         | Apps that "encourage consumption of ... excessive amounts of alcohol are not permitted."                                                                                                                   | Medium. Drinks are the forfeit, with no cap.                            | See [Alcohol](#alcohol).                                                                                                             |
| 4.3(b)        | Names "drinking games, Kama Sutra, fart, and burp apps" as "mediocre, low-quality, or low-effort".                                                                                                         | Medium. A reviewer may file the app under either.                       | The notes say what sets it apart: two games, a curated deck, the couple's own content, the lock.                                     |
| 2.3.1(a)      | New features "must be described with specificity in the Notes for Review section".                                                                                                                         | Low, if the notes are complete.                                         | The draft notes describe every part, the explicit content and the vibration card.                                                    |
| 2.5.19        | "Don't include any hidden, dormant, or undocumented features in your app".                                                                                                                                 | Low. Hiding the vibration card from review would break it.              | The card is described in the notes. The developer gallery route is not reachable in a production build (see `docs/architecture.md`). |
| 2.3.6         | "Answer the age rating questions in App Store Connect honestly".                                                                                                                                           | Medium. See the Graphic Sexual Content answer.                          | Answers below, with reasons. The notes disclose the explicit wording.                                                                |
| 2.3.7         | "App names must be limited to 30 characters." No trademarked terms, popular app names or pricing in metadata.                                                                                              | Low.                                                                    | Draft listing below.                                                                                                                 |
| 2.3.8         | Icons, screenshots and previews must "adhere to a 4+ age rating even if your app is rated higher."                                                                                                         | Medium, if a screenshot shows a bold card or the drink line.            | See [Metadata rule](#metadata-rule).                                                                                                 |
| 1.2           | Rules for apps where users create and share content.                                                                                                                                                       | None. Player-written cards stay on the phone and are never shared.      | The notes say so. The age rating answer for user-generated content is No (A2 defines it as "broad distribution").                    |
| 5.1.1(i)      | A privacy policy link in App Store Connect "and within the app in an easily accessible manner".                                                                                                            | Low.                                                                    | `privacyPolicy` in `packages/content`, shown in Settings (FRK-63) and hosted by the owner.                                           |
| 5.1.1(v)      | Apps without significant account features must not require a login.                                                                                                                                        | None.                                                                   | No accounts.                                                                                                                         |
| 5.1.2         | Rules on using and sharing personal data.                                                                                                                                                                  | None.                                                                   | Nothing is collected or shared.                                                                                                      |
| 3.1.1         | In-app purchases go through Apple, with a restore option.                                                                                                                                                  | Only if FRK-42 picks a purchase. Not reviewed in detail here.           | FRK-71 covers it.                                                                                                                    |
| Age assurance | A10: "If my app is rated 18+, do I still need to implement the Declared Age Range API? Yes. In regions where legally required".                                                                            | Likely for Texas accounts, duties unsettled.                            | See [Age assurance](#age-assurance).                                                                                                 |

No guideline mentions vibration. That Apple has rejected apps whose main purpose is to act as a
vibrator is from the FRK-29 ticket and developer reports. **Unconfirmed** from a primary source.

## Google Play rules that apply

| Rule                              | What it says                                                                                                                                                                                                                                                                                                                                               | Risk for Get Freak                                                                     | What the app does                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Sexual content and profanity (G1) | "We don't allow apps that contain or promote sexual content or profanity, including pornography". Examples include "Content that depicts or are functionally sexual aids, sex guides" and content that "may contain profanity, slurs, explicit text". The only exceptions are educational, documentary, scientific or artistic nudity, and catalogue apps. | High. There is no exception for adult apps.                                            | See [Explicit dares](#explicit-dares) and [Vibration dare](#vibration-dare).                           |
| Tobacco and alcohol (G1)          | No "Portraying excessive drinking favorably, including the favorable portrayal of excessive, binge or competition drinking". No encouraging alcohol use by minors.                                                                                                                                                                                         | Medium. The game is a contest with a drink forfeit.                                    | Drinks never decide the winner. 18+ only. See [Alcohol](#alcohol).                                     |
| Content ratings (G2, G3)          | Every app needs a rating. "Misrepresentation of your app's content may result in its removal or suspension." A rating authority can refuse classification, and the app is then removed in that territory only.                                                                                                                                             | Medium. Refused classification in some territories is possible. **Unconfirmed** which. | Answers below.                                                                                         |
| Metadata (G4)                     | No "Imagery or videos with sexually suggestive content". "Your listing should be suitable for a general audience." No emojis in the title, no ALL CAPS, no ranking or price claims. Title of 30 characters or fewer.                                                                                                                                       | Medium, as for Apple 2.3.8.                                                            | See [Metadata rule](#metadata-rule).                                                                   |
| Data safety (G5)                  | "Even developers with apps that do not collect any user data must complete this form." A privacy policy link is required.                                                                                                                                                                                                                                  | Low.                                                                                   | Answers below.                                                                                         |
| Enforcement (G7)                  | "Rejections don't impact the standing of your Google Play Developer account." Multiple removals may lead to a suspension, and "Suspensions count as strikes". Repeated strikes can end the account.                                                                                                                                                        | High stakes. A removal after publication is worse than a rejection.                    | Learn the outcome from the closed test before production. Do not resubmit unchanged after a rejection. |

## Content risks

### Explicit dares

The owner decided on 2026-11-19 that the Oral and Sex cards are explicit (FRK-30). FRK-44 made the
Foreplay cards explicit too: undressing to naked, hands inside underwear and on genitals. So three
of the four categories, 96 of the 128 cards, are sexual activity, and the Spicy level reaches them.

**Risk on the App Store.** Explicit text dares exist in couples apps on the App Store, but 1.1.4
rejects "explicit descriptions ... of sexual organs or activities intended to stimulate erotic ...
feelings". The new age rating questionnaire adds a second test. Its "Graphic Sexual Content and
Nudity" descriptor, at any frequency, makes an app Unrated, and "An Unrated app can't be published
on the App Store" (A2). A2 defines it as "Explicit, detailed depictions of sexual activity or
nudity", and its examples are all visual: "uncensored or full-frontal nudity; realistic,
illustrative, or pornographic portrayals of sex."

**Risk on Google Play.** Higher. The policy has no adult exception, and it names "explicit text" in
the app and "sex guides" (G1). An 18+ rating does not make sexual content allowed on Google Play.

**Mitigations already in place.**

- Text only. No images, illustrations, video or audio of anything sexual.
- Short instructions for two partners, not stories or descriptions for a reader.
- Rated 18+ on both stores, with target audience 18 and over on Google Play.
- The 18+ confirmation before any screen.
- Couples framing throughout, consent lines on many cards, skip any card at no cost.
- The listing and screenshots show only the mildest level.
- The review notes disclose the explicit wording plainly, so a reviewer is not surprised.

**What the owner can change if a review rejects it**, from least to most work:

1. Soften the wording on the store that objects: remove the slang words for genitals and the most
   graphic details from the Oral, Sex and bolder Foreplay cards. This is a data change in
   `starter.json`.
2. Ship a separate deck per platform, for example a softer deck on Android. This needs a small code
   change to pick the deck by platform.
3. Ship that store without the explicit categories. Since FRK-44 that means Soft only, or Soft with
   a softened Foreplay, because Foreplay is explicit too. Levels and setup would need to handle the
   missing categories.

On Google Play, a rejection costs nothing in account standing, but a removal after publication
does. The closed test that a new personal Play account must run (FRK-58) will show the review
outcome before production.

### Vibration dare

FRK-29 adds one card that makes the phone vibrate for 10 seconds while held against a partner.

- **Apple.** Apps whose main purpose is to act as a vibrator have been rejected (**Unconfirmed**,
  see above). One card in a card game is a different case, but it is a review risk.
- **Google.** The card could be read as content that is "functionally" a sexual aid (G1). The risk
  is higher than on Apple. Google Play has no dedicated reviewer notes for content, only App access
  instructions and appeals (**Unconfirmed**: not checked against Play Console).

Decision (tech lead, 2026-11-19, from the ticket): describe the card in the App Review notes, keep it
out of the listing and the screenshots, and if review objects, take the card out of the deck (a data
change, no code) and resubmit. Hiding it from review is not an option. Apple 2.3.1(a) requires new
features to be described in the notes, and 2.5.19 forbids hidden features.

Recommendation for the owner, not decided here: consider leaving the card out of the first Android
submission, since a removal on Google Play can count against the account and there is no
dedicated place to explain the card to the reviewer before review.

### Alcohol

Passing a card costs 1 to 4 drinks, rising with the category. A together card costs both players.
There is no cap and no non-alcoholic mode (owner, 2026-11-18, FRK-16). The second game is named
"Drink If".

Worked example, using the penalties in `packages/core/src/contentModel.ts` (Soft 1, Foreplay 2,
Oral 3, Sex 4) and the round rules in `docs/architecture.md`. A 20 card round at Freaky deals 5
cards from each category. Cards 5, 10, 15 and 20 are together cards, one per category, and the
other 16 are solo cards, 2 per player in each category. If every card is passed:

- Solo cards, per player: 2 × (1 + 2 + 3 + 4) = 20 drinks.
- Together cards, charged to both: 1 + 2 + 3 + 4 = 10 drinks each.
- So each player is told to drink 30 times, and the pair 60. That is the 20 cards at an average of
  2.5 (50), plus the 10 that together cards charge a second time.
- A 10 card round at Freaky gives 17 each. An endless round at Freaky with every card passed deals
  all 128 cards and gives about 205 each.

These figures were checked by running the round engine with every card passed, for three seeds.

- **Apple 1.4.3** does not allow apps that "encourage consumption of ... excessive amounts of
  alcohol".
- **Apple 4.3(b)** lists drinking games among low-value apps.
- **Google** does not allow "Portraying excessive drinking favorably, including ... competition
  drinking" (G1).

What already helps: any card can be skipped with "Not this one" at no cost, so nobody has to drink.
The winner is the player with more dares done, and drinks never break a tie, so the app does not
reward drinking more. Players choose the level and the length.

Options if review objects. None is made in this ticket.

1. Call the unit a sip. A copy change in `packages/content`. This is the cheapest and most
   effective change.
2. Add a responsible drinking line to the 18+ screen, such as "Drink responsibly, and only if you
   are of legal drinking age." A copy change.
3. Add a drink cap per player. Needs an engine rule in `core` and a setup control.
4. A non-alcoholic forfeit mode. The largest change.

Recommendation for the owner: make option 1 before the first submission. It costs little and
removes most of the 1.4.3 risk.

### Player-written dares and questions

Milestones 3 and 5 let a couple write their own dares and questions, and keep favourites, decks and
answers. They stay on the phone, encrypted, and are never uploaded, shared or shown to anyone else.
They are not user-generated content in the store sense: A2 defines it as "the broad distribution of
content created by users". The review notes say so.

## Age rating answers

### App Store

The questionnaire is in App Store Connect, App Information, Age Ratings (A3). Apple added the 13+,
16+ and 18+ tiers and new required questions on 24 July 2025 (A4). The answers below use the
descriptor names in A2. The exact wording of each question could not be read without an App Store
Connect account. **Unconfirmed**, so match each answer to its descriptor.

**In-app controls and capabilities**

| Item                    | Answer | Why                                                                                                                                                          |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Parental controls       | No     | None in the app.                                                                                                                                             |
| Age assurance           | No     | A2 lists the Declared Age Range API, age estimation or ID checks. A tap to confirm 18+ is none of these. Change to Yes if the app adopts Declared Age Range. |
| Unrestricted web access | No     | No browser and no links out.                                                                                                                                 |
| User-generated content  | No     | Player-written cards never leave the phone.                                                                                                                  |
| Messaging and chat      | No     | None.                                                                                                                                                        |
| Advertising             | No     | None.                                                                                                                                                        |

**Content**

| Descriptor                                       | Answer     | Tier it gives (A2) | Why                                                                                                                               |
| ------------------------------------------------ | ---------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Profanity or crude humour                        | Infrequent | 9+                 | A few cards use slang words for genitals. Most cards use plain words.                                                             |
| Horror or fear themes                            | None       |                    |                                                                                                                                   |
| Alcohol, tobacco, or drug use or references      | Frequent   | 18+                | Every card shows a drink forfeit and the summary counts drinks.                                                                   |
| Mature or suggestive themes                      | Frequent   | 16+                | Sexual themes run through the whole deck.                                                                                         |
| Medical or treatment information                 | None       |                    |                                                                                                                                   |
| Health or wellness topics                        | None       |                    |                                                                                                                                   |
| Sexual content or nudity                         | Frequent   | 18+                | Three quarters of the deck (Foreplay, Oral and Sex) is sexual activity, including nudity between the partners, described in text. |
| Graphic sexual content and nudity                | None       | (Unrated if any)   | A judgement call. See below.                                                                                                      |
| Cartoon or fantasy violence                      | None       |                    |                                                                                                                                   |
| Realistic violence                               | None       |                    | Holding a partner's wrists, with a stop line, is not violence.                                                                    |
| Prolonged graphic or sadistic realistic violence | None       |                    |                                                                                                                                   |
| Guns or other weapons                            | None       |                    |                                                                                                                                   |
| Simulated gambling                               | None       |                    | Drinks are not wagered.                                                                                                           |
| Contests                                         | Infrequent | 4+                 | Each round ends with a light score between the two players.                                                                       |
| Gambling                                         | No         |                    |                                                                                                                                   |
| Loot boxes                                       | No         |                    |                                                                                                                                   |

Expected result: **18+**, from frequent sexual content and frequent alcohol references. No override.
Age categories: Not Applicable. Leave the age suitability URL empty.

**The Graphic Sexual Content answer.** This is the one answer that decides whether the app can be
on the App Store at all. A2 describes "Explicit, detailed depictions", and every example it gives is
visual: nudity, and realistic, illustrative or pornographic portrayals. The app shows no images. Its
cards are short instructions for two partners, not depictions for a viewer. On that reading the
honest answer is None, and the cards fall under frequent "Sexual content or nudity", which A2 says
may include "implied sexual activity, or erotic or sensual dialog". The other reading is that
explicit text is itself an explicit depiction. Then the honest answer is Infrequent or Frequent, the
app is Unrated, and it cannot ship on the App Store with this deck.

Decision for FRK-56: answer None, and say plainly in the review notes that the Foreplay, Oral and Sex cards
name sexual acts in adult language. App Review then decides with the full picture, which keeps the
answer within 2.3.6. If App Review says the content is graphic, the owner chooses a deck option from
[Explicit dares](#explicit-dares). The owner may read it the other way, and that is their call.

### Google Play (IARC)

The questionnaire is in Play Console, App content, Content rating (G3). It gives ratings from ESRB
(Americas), PEGI (Europe and the Middle East), USK (Germany), ClassInd (Brazil), ACB and GRAC (games
only), a Google Play rating for apps in South Korea and Russia, and an IARC generic rating
elsewhere (G3). The question wording is not public. **Unconfirmed**, so these are the facts to
answer from, topic by topic.

| Topic                 | Answer from these facts                                                                                                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Category              | Game. The app is a card game for two players. (Choose an app category only if the console has no fitting game type.)                                                                                                                                            |
| Violence and fear     | None.                                                                                                                                                                                                                                                           |
| Sexuality             | Yes. Explicit sexual content in text: oral sex and intercourse, named plainly, and nudity between partners described in text. No images, animation or video of nudity or sex. Answer each question about text and about visuals separately, as these facts say. |
| Language              | Yes, crude sexual language, occasional.                                                                                                                                                                                                                         |
| Controlled substances | Yes, alcohol. Drinking is the forfeit for passing a card, so the app refers to and encourages drinking. No tobacco or drugs.                                                                                                                                    |
| Crude humour          | Mild, occasional.                                                                                                                                                                                                                                               |
| Gambling              | None. No simulated gambling and no real money.                                                                                                                                                                                                                  |
| User interaction      | No. No chat, no sharing between users, no user content shared outside the phone.                                                                                                                                                                                |
| Shares location       | No.                                                                                                                                                                                                                                                             |
| Digital purchases     | Yes only if FRK-42 picks a purchase.                                                                                                                                                                                                                            |
| Unrestricted internet | No.                                                                                                                                                                                                                                                             |

Expected ratings, from the definitions in I1. **Unconfirmed** until the questionnaire is run:

- IARC generic 18+ ("graphic sexual content" is in its 18+ tier, "sexual activity" in 16+).
- PEGI 18.
- USK 18 (USK 16 covers products with an erotic or sexual focus, so 16 is possible).
- ClassInd 18 ("relação sexual explícita").
- ESRB Mature 17+ or Adults Only 18+.
- Google Play rating 18+ in Russia and 19+ in South Korea, if rated as an app.

Then, in App content: target audience 18 and over only, ads none, app access all of it with no
sign-in, and not a news, government, financial or health app (FRK-73).

## Privacy label and data safety

### Expected answers

- **App Store privacy label: Data Not Collected.** Apple defines "collect" as "transmitting data off
  the device in a way that allows you and/or your third-party partners to access it", and "Data that
  is processed only on device is not 'collected'" (A5). Crash logs that Apple gathers from players
  who opt in do not count: "You are not responsible for disclosing data collected by Apple" (A5).
- **Google Play data safety: no user data collected or shared.** Google defines "Collect" as
  "transmitting data from your app off a user's device", and the form must still be completed (G5).
  Whether Android vitals, which Google gathers from players who opt in, needs declaring is not
  covered in G5. **Unconfirmed**. It is Google's own collection, not the app's, so the answer stays
  "no data collected".
- Both stores need the privacy policy URL. The text is `privacyPolicy` in `packages/content`, and
  the owner hosts the same words.

### Must be true before the privacy policy is published

The policy describes the launch build. Where a feature is not built yet, its text starts with "if",
so it is true whether or not the feature ships. These must still be true before the owner hosts the
policy or gives its URL to a store:

- FRK-58 sets `android.allowBackup` to `false` in `app.json`.
- FRK-41 stores the database key in `expo-secure-store` with device-only keychain accessibility
  (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`), so the key is never in a backup and a backup of the encrypted
  store cannot be read on another phone.
- FRK-53 keeps the PIN only as a salted hash in secure storage, and its install marker clears
  secure storage on the first launch after a reinstall.
- FRK-63 ships Clear everything in Settings, as the policy describes it.
- FRK-63 and FRK-73 re-read the policy against the build that is submitted, and change it if
  anything differs. FRK-73 also replaces the placeholder contact email and turns on the launch gate
  test in `privacyPolicy.test.ts`.

### Every library against "no data collected"

Checked from `apps/mobile/package.json` on `main` and from the source of `apps/mobile`, which has no
`fetch`, no HTTP URL and no socket. Libraries the app's code does not import still ship if declared,
so all are listed.

| Library                                                                | What it does                                                                 | Sends data off the phone?                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expo`                                                                 | Runtime and module system                                                    | No. Its dependencies include `expo-asset`, `expo-file-system` and `expo-keep-awake`, none used for network calls. `expo-updates` is not installed, so the app never fetches updates.                                                                |
| `expo-router`, `expo-linking`, `expo-constants`                        | Navigation, deep links, app config                                           | No.                                                                                                                                                                                                                                                 |
| `expo-font`, `@expo-google-fonts/baloo-2`, `@expo-google-fonts/nunito` | Fonts                                                                        | No. The font files are bundled with the app and loaded from the bundle.                                                                                                                                                                             |
| `expo-audio` (FRK-26)                                                  | Button sounds                                                                | No. Plays three short sound files bundled with the app, from `assets/sounds`. The config plugin is set to add no microphone permission, no record permission and no background playback.                                                            |
| `expo-asset` (FRK-26)                                                  | Loads bundled files, such as the sounds                                      | No. It can download a file from a URL it is given, but the app only gives it files in its own bundle.                                                                                                                                               |
| `expo-haptics` (FRK-28)                                                | Press haptics                                                                | No. On Android it uses the view haptic effects, which need no permission.                                                                                                                                                                           |
| `expo-sqlite`                                                          | Settings, including the sound and vibration switches, in its key-value store | No. Local database only (E1).                                                                                                                                                                                                                       |
| `expo-status-bar`, `expo-system-ui`                                    | Status bar and background colour                                             | No.                                                                                                                                                                                                                                                 |
| `expo-dev-client`                                                      | Development builds                                                           | Not in store builds. Its launcher only works in debug builds, and release builds "will not change other than the addition of a few header files" (E5, version 56. **Unconfirmed** for 57). The production profile must not set `developmentClient`. |
| `react`, `react-native`, `react-dom`                                   | UI                                                                           | No. `react-dom` is for the web build only.                                                                                                                                                                                                          |
| `react-native-reanimated`, `react-native-worklets`                     | Animation                                                                    | No.                                                                                                                                                                                                                                                 |
| `react-native-screens`, `react-native-safe-area-context`               | Layout                                                                       | No.                                                                                                                                                                                                                                                 |
| `nativewind`, `react-native-css-interop`                               | Styling                                                                      | No.                                                                                                                                                                                                                                                 |
| `zod`                                                                  | Validation                                                                   | No.                                                                                                                                                                                                                                                 |
| `@getfreak/core`, `@getfreak/content`, `@getfreak/tokens`              | This repository's packages                                                   | No.                                                                                                                                                                                                                                                 |

Libraries on their way:

| Library                              | Ticket            | Sends data off the phone?                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `expo-sqlite` with SQLCipher         | FRK-41            | No. Encrypts the local database. See [Export compliance](#export-compliance).                                                                                                                                                                                                                    |
| `expo-secure-store`                  | FRK-41, FRK-53    | No. Keychain on iOS, Keystore-encrypted storage on Android (E2).                                                                                                                                                                                                                                 |
| `expo-crypto`                        | FRK-41, FRK-53    | No. Random ids and SHA-256 on the phone.                                                                                                                                                                                                                                                         |
| `expo-local-authentication`          | FRK-53            | No. The phone checks Face ID or a fingerprint and only tells the app yes or no.                                                                                                                                                                                                                  |
| `expo-notifications`                 | FRK-53, FRK-68    | No, as long as the app only schedules local notifications. Never call `getExpoPushTokenAsync` or `getDevicePushTokenAsync`: a push token is device data sent to a server, and would change both answers.                                                                                         |
| `expo-screen-capture`                | FRK-53, FRK-66    | No.                                                                                                                                                                                                                                                                                              |
| Vibration module                     | FRK-29            | No. A local module or a library with no network code.                                                                                                                                                                                                                                            |
| Purchase library                     | FRK-71, if needed | Apple and Google handle purchases under their own policies, and the app asks the store on the phone. `expo-iap` or `react-native-iap` keep the answer at "no data collected". A service such as RevenueCat would not, and FRK-71 rules it out. Check the chosen library's own data safety notes. |
| Declared Age Range, Play Age Signals | Not yet ticketed  | No, if the app only reads the age range on the phone and never sends it. Google says "No data is collected by the Play Age Signals client library" (G8).                                                                                                                                         |

### What would change the answers

Any of these needs this document, the privacy policy, both store forms and possibly a new rating
review, in the same pull request:

- An analytics, crash reporting or advertising SDK.
- Any network call made by the app, other than the store's own purchase calls.
- A push token, an account or a server.
- Sending anything the app stores, including the age range, off the phone.

Before submission, check a release build on a real phone behind a network monitor and confirm it
makes no connection apart from store purchases. This turns "no network calls" from a code reading
into a measured fact. Add it to FRK-74.

### Privacy manifest

FRK-58 adds `ios.privacyManifests` to `app.json`. Expo SDK packages that use required reason APIs
ship their own `PrivacyInfo.xcprivacy`, but Apple does not read all of them from static CocoaPods
dependencies, so the reasons may need repeating in `app.json` (E3). Declaring a reason for an API
such as `UserDefaults` does not mean data is collected.

## Export compliance

The key is `ITSAppUsesNonExemptEncryption`. Apple says: "Set the value to `NO` if your app,
including any third-party libraries it links against, doesn't use encryption, or if it only uses
forms of encryption that are exempt from export compliance documentation requirements. Otherwise,
set it to `YES`" (A6). A8 sets out three cases:

| Case (A8)                                                                                       | Documentation in App Store Connect                                |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| "Your app uses encryption limited to that within the Apple operating system"                    | None.                                                             |
| "Your app uses an industry standard algorithm, not provided within the Apple operating system"  | The French encryption declaration, only if distributed in France. |
| "Your app uses proprietary encryption algorithms not accepted by international standard bodies" | A US CCATS and the French declaration.                            |

What the app uses:

- **Keychain and Keystore** through `expo-secure-store`: the operating system's own encryption.
- **SHA-256** through `expo-crypto`, for the PIN hash. Hashing is not encryption, and on iOS
  `expo-crypto` calls the operating system's CommonCrypto. That it uses CommonCrypto is inferred
  from its MD2 and MD4 support on iOS only. **Unconfirmed** from its source.
- **SQLCipher** through `expo-sqlite` (FRK-41). In `expo-sqlite` 57.0.5, the iOS build compiles
  SQLCipher with `SQLCIPHER_CRYPTO_CC`, so its cipher calls Apple's CommonCrypto. The Android build
  links a bundled OpenSSL (E4). Zetetic, who make SQLCipher, say "SQLCipher's encryption is above and
  beyond that provided by the Apple operating system" (Z1).

The answer:

- **Until SQLCipher ships: `NO`.** Everything the app uses is the operating system's own encryption
  or hashing.
- **Once SQLCipher ships: `YES`,** and in App Store Connect choose "an industry standard algorithm,
  not provided within the Apple operating system". SQLCipher uses standard AES, but its encryption
  scheme is its own layer above the operating system's primitives, so the exemption for encryption
  "limited to that within the Apple operating system" is not safe to claim. This needs no CCATS,
  per A8, which asks for one only for proprietary algorithms (**Unconfirmed**: take advice).
  It needs the French encryption declaration only if the app is offered in France. The owner either
  files that declaration or leaves France out of the launch countries.

FRK-58 sets the key. If FRK-41 has not merged when FRK-58 lands, FRK-58 sets `NO` and FRK-41 changes
it to `YES` in the same pull request that turns SQLCipher on.

Not settled, for the owner to take advice on:

- Apple notes that an app using only exempt encryption "might alternatively be required to submit a
  year-end self-classification report to the U.S. government" (A6), and that "you're responsible for
  all liabilities associated with misinterpretation of export regulations or claiming exemption
  inaccurately" (A7). Whether a mass market app like this one needs that report was not confirmed.
- Google Play has no export question in the console that this review found, but US export rules
  still apply to the Android build with its bundled OpenSSL. **Unconfirmed** what, if anything, is
  needed.

## Age assurance

### Status on 19 November 2026

- **Texas, SB 2420 (App Store Accountability Act).** In force. A district court blocked it on
  23 December 2025. The Fifth Circuit stayed that injunction on 4 June 2026 after an administrative
  stay on 28 May, and the Supreme Court declined to lift the stay on 6 July 2026. The Fifth Circuit
  heard argument on 4 August 2026 and had not ruled as of 13 October 2026 (L1, secondary). Whether
  it has ruled since is **Unconfirmed**.
- **Apple** says new Apple Accounts in Texas must confirm whether the user is 18 or over, and that
  developers "will need to adopt new capabilities and modify behavior within their apps" (A11). It
  asks developers to use the Declared Age Range API for the user's age category, the Significant
  Change API when an app changes significantly, the StoreKit age rating property, and the server
  notification for revoked consent (A12). The API "is available worldwide", and Apple shares age
  categories "In certain regions, where legally required" (A10).
- **Apple on 18+ apps:** "If my app is rated 18+, do I still need to implement the Declared Age Range
  API? Yes. In regions where legally required, you need to check the age of the people using your
  app with the Declared Age Range API" (A10).
- **Google** offers the Play Age Signals API, in beta. Its data may be used only "to provide
  age-appropriate content and experiences in compliance with laws" (G8). Google says it "doesn't
  mandate the use of these features" and that developers must decide "whether and how these laws
  apply to your app" (G9).
- **Utah and Louisiana.** Apple said in October 2025 that similar requirements would follow in both
  states (A11). Later secondary reports say Utah moved most duties to 6 May 2027 (HB 498) and
  Louisiana replaced HB 570 with HB 977, starting 1 July 2027 (L2). **Unconfirmed** from the bill
  texts.

### What the app must do

The app is 18+ and has nothing to offer a minor, so the only behaviour it needs is to keep minors
out. If it launches in the US App Store while the Texas law is in force:

1. On iOS, ask the Declared Age Range API for the age category where the law requires it
   (`requiredRegulatoryFeatures`, iOS 26.4 or later per A10). If the user is under 18, show the
   existing closing screen ("Come back when you are 18") and nothing else.
2. On Android, do the same with the Play Age Signals API.
3. Keep the result on the phone. Do not store or send the age range beyond what the check needs.
   Then the privacy answers do not change.
4. The Significant Change and consent revocation flows matter only for minors who were let in with
   a parent's consent. An adults-only app lets no minor in, so it should not need them.
   **Unconfirmed**: take legal advice.
5. Set the Age assurance control in the Apple questionnaire to Yes once this ships.

Neither API has an Expo SDK module that this review found. Each needs a small local native module
and a new build. Decision for FRK-56: recommend a new ticket in milestone 4 for this work, before a
US launch. It is not in this ticket.

### What is unsettled

- Whether the Fifth Circuit upholds the Texas law.
- Whether an app with no accounts, no purchases and an 18+ rating has developer duties under SB 2420
  beyond keeping minors out.
- The final dates and duties in Utah and Louisiana.
- Whether other states follow. Secondary sources mention Alabama.

## Metadata rule

Apple: icons, screenshots and previews "adhere to a 4+ age rating even if your app is rated higher"
(A1, 2.3.8). Google: no "Imagery or videos with sexually suggestive content", and "your listing
should be suitable for a general audience" (G4). Google also names "adult/sexual keywords in the
store listing" as a violation (G1).

The rule for the icon, screenshots, previews, the Play feature graphic and all listing text:

- Nothing a child could not see. No nudity, no underwear, no bodies in suggestive poses, no hands on
  bodies.
- No sexual words, slang or innuendo, and no category names other than Soft (so not Foreplay, Oral or
  Sex) and no level names other than Flirty.
- Only the mildest content: screens at the Flirty level, with Soft cards. Choose Soft cards that are
  compliments, eye contact or a kiss on the hand.
- No alcohol shown, and no drinking words in images. Most play screens show the drink line ("Pass and
  you drink 1"), and the home screen shows "Freak or Drink" and "Drink If". Crop those out, or cover
  them with the caption band of a designed screenshot (FRK-51 frame 13).
- No vibration card, and no mention of it.
- Text in the listing may say the app is for adults 18 and over, and must describe the app honestly
  (A1, 2.3.1). It mentions the forfeit plainly and without encouragement.
- Google: no emojis or repeated special characters in the title, icon or developer name, no ALL
  CAPS, and no ranking or price claims (G4).

## Draft store listing

Limits: Apple name and subtitle 30 characters each (A13), keywords 100 bytes, promotional text 170
characters, description 4000 characters (A14). Google title 30 characters, short description 80,
full description 4000 (G6).

| Field                  | Draft                                                                                             | Length |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Name (both stores)     | `Get Freak: Couples Game`                                                                         | 23     |
| Apple subtitle         | `Dares for two, on one phone`                                                                     | 27     |
| Apple promotional text | `Date night, sorted. Pass the phone, draw a dare and have fun together. Adults only.`             | 83     |
| Play short description | `Playful dares for couples. Two of you, one phone, you set the pace. 18+ only.`                   | 77     |
| Apple keywords         | `couple,dare,date night,romance,relationship,party game,two player,flirt,partner,love,game night` | 95     |
| Category (both stores) | Entertainment                                                                                     |        |

The home screen name stays "Get Freak" (owner, 2026-11-18). The store name adds a short descriptor,
which 2.3.7 allows. If the owner prefers, the store name can be plain "Get Freak".

Full description, for both stores:

```text
Get Freak is a game for couples, played together on one phone.

Take turns drawing dares, pass the phone, and decide together how bold to be. Start gentle with
Flirty and play at a pace you both enjoy. Every round is yours to shape.

How It Works
- Enter your names and choose how bold and how long.
- Draw a dare. Do it, or pass and take the forfeit, a drink.
- Some cards are for both of you at once.
- Not feeling a card? Skip it at no cost, or switch a whole category off.
- At the end of the round, see who was boldest.

Made for Two
- One phone, passed between you. No sign-up and no account.
- Over a hundred hand-written dares that build from sweet to bold.
- Pick your level and your round length, from a quick ten cards to endless.

Private by Design
- Nothing leaves your phone. No accounts, no ads, no tracking.
- Clear everything in one tap.

Get Freak is for adults aged 18 and over. Play at your own pace, look after each other, and only
drink if you are of legal drinking age and want to.
```

Before using it, cut any line about a feature the submitted build does not have, and add lines for
features it does, such as the app lock and the couple's own dares. Keep the hyphens as plain list
markers. Apple's description is plain text with no formatting (A14).

## Draft App Review notes

For App Store Connect, App Review Information, Notes (FRK-74). Sign-in required: No. Update the
bracketed parts to match the build submitted, then remove the brackets.

```text
Get Freak is a card game for adult couples. Two consenting adults play together, in private, on one
phone that they pass between them. There is no sign-in, no account, no server and no chat. Nothing
a player enters leaves the phone.

WHO IT IS FOR
Adults aged 18 and over, playing with their partner. On first launch the app asks the player to
confirm they are 18 or over. Tapping No shows a closing screen, and no other screen can be opened
until a player confirms. The app is rated 18+.

HOW TO REACH EACH PART
1. Launch the app and tap "Yes, let me in".
2. The home screen lists the games. Tap "Freak or Drink". [The second game, "Drink If", is marked
   Coming soon.]
3. On "Set the round", enter any two names. "How bold?" sets the level. Flirty deals the mildest
   category only, Spicy adds the second, and Freaky deals all four. Choose a length and tap Start.
4. Each card is a dare for the player holding the phone, or for both players. Tap "Done!" if they
   do it, or "Pass" to take the forfeit. "Not this one" skips any card at no cost, or switches a
   category off for the rest of the round.
5. "End round" shows the summary, with Play again, Settings and Home.
6. Settings opens from the home screen. It has switches for Sounds and Vibration (button feedback
   only, not the vibration card), the privacy policy, [the app lock,] [the weekly reminder,]
   [Restore purchases,] and Clear everything, which deletes everything the app has stored and
   returns to the 18+ question.

CONTENT
The cards are text only. There are no images, video or audio of a sexual nature. The deck has four
categories that build in order: Soft (compliments and kisses), Foreplay (undressing and touching,
including by hand), Oral and Sex. The Foreplay, Oral and Sex cards name sexual acts between the two
partners plainly, in the language adults use with each other. They are written for a consenting
couple. Many cards say either partner can stop at any time, and any card or whole category can be
skipped at no cost. The store listing and screenshots show only the mildest level.

THE FORFEIT
Passing a card costs drinks, from 1 in the mildest category to 4 in the boldest. Nobody has to
drink: any card can be skipped with "Not this one" at no cost. The winner of a round is the player
who did more dares, never the one who drank more.

THE VIBRATION CARD
One card [in the Foreplay category] asks a player to hold the phone against their partner. When they
tap "Go", the phone vibrates for 10 seconds with a countdown, and "Stop" ends it at once. It is one
card in a deck of [129]. It is not a mode or a separate feature. To find it quickly, choose
[Spicy], switch every category off except [Foreplay], choose Endless, and play until it is dealt.
It comes up within [33] cards.

THE COUPLE'S OWN CARDS
[Players can write their own dares, keep favourites and build decks.] These are stored only on this
phone, encrypted, and are never uploaded, shared or shown to anyone else. The app has no
user-generated content in the store sense.

APP LOCK
[Off by default. In Settings, a player can set a 4 digit PIN, and Face ID if they like. With the
lock on, the app asks for the PIN at every launch and after 60 seconds or more away, and hides its
content in the app switcher. "Forgot PIN?" leads to Clear everything. A fresh install has the lock
off, so you will not meet it unless you turn it on.]

PRIVACY
No accounts, no analytics, no crash reporting, no ads and no tracking. The app makes no network
requests [apart from the App Store's own purchase calls]. The privacy label is Data Not Collected.

WHAT SETS IT APART
This is not a simple drinking game. It is a designed card game for couples with over a hundred
hand-written cards that build in steps, [the couple's own dares and decks,] an app lock, and a
privacy-first design with nothing leaving the phone.
```

Google Play has no dedicated reviewer notes for content, only App access instructions and appeals
(**Unconfirmed**: not checked against Play Console). App access says the whole app is available with
no sign-in. If a rejection names the explicit cards or the vibration card, the appeal can use the
CONTENT and THE VIBRATION CARD paragraphs above.

## Decisions made in this ticket

| Decision                            | Outcome                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error reporting and analytics       | None at launch. Crash data comes only from what Apple and Google collect from players who opt in, with no SDK in the app. Recorded in `docs/architecture.md`.                                                                                           |
| Apple Graphic Sexual Content answer | None, with the explicit wording disclosed in the review notes. A judgement call the owner may reverse, knowing that any other answer makes the app Unrated on the App Store.                                                                            |
| Contests and profanity answers      | Infrequent for both. Neither changes the 18+ result.                                                                                                                                                                                                    |
| Apple Age assurance control         | No at launch, Yes once Declared Age Range ships.                                                                                                                                                                                                        |
| IARC category                       | Game.                                                                                                                                                                                                                                                   |
| `ITSAppUsesNonExemptEncryption`     | `NO` until SQLCipher ships, then `YES` with "industry standard algorithm". The owner files the French declaration or leaves France out.                                                                                                                 |
| Store name                          | "Get Freak: Couples Game" in both stores. The home screen name stays "Get Freak".                                                                                                                                                                       |
| Store category                      | Entertainment on both stores, as proposed.                                                                                                                                                                                                              |
| Privacy policy scope                | Written for the launch build. Features that may not have shipped yet are described with "if", and a list says what must be true before it is published, so the text stays true either way. Change it if a decision in FRK-41, FRK-53 or FRK-58 changes. |
| Age assurance                       | Recommend a new milestone 4 ticket for Declared Age Range and Play Age Signals, before a US launch.                                                                                                                                                     |

## Recommendations for the owner

Not decided here:

1. Call the drink unit a sip before the first submission (see [Alcohol](#alcohol)).
2. Leave the vibration card out of the first Android submission (see [Vibration dare](#vibration-dare)).
3. Decide now which deck option to use if a store rejects the explicit cards, so a resubmission is
   quick (see [Explicit dares](#explicit-dares)).
4. Take advice on export compliance for France and on the Texas law.

## Unconfirmed

- The exact wording of the Apple age rating questions and of the IARC questions. The answers above
  are matched to the published descriptor names and topics.
- The ratings Google Play will give in each region, and whether any authority refuses
  classification.
- That Apple has rejected apps whose main purpose is to vibrate (from FRK-29, not from a guideline).
- That `expo-dev-client` adds nothing that runs in a release build on SDK 57 (checked for version 56).
- That `expo-crypto` uses CommonCrypto on iOS.
- Whether a self-classification report or any Android export filing is needed.
- Whether Android vitals needs declaring in the data safety form.
- The current state of the Texas appeal after 13 October 2026, and the Utah and Louisiana dates.
- Whether the Texas law gives an adults-only app with no accounts any duty beyond keeping minors out.
