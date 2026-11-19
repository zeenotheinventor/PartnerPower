export type PrivacyPolicySection = {
  heading: string;
  paragraphs: readonly string[];
};

export type PrivacyPolicy = {
  title: string;
  updated: string;
  contactEmail: string;
  sections: readonly PrivacyPolicySection[];
};

// Placeholder. The owner replaces it with the real contact address before launch (FRK-73). The
// same address goes in the hosted copy of this policy. A skipped test in privacyPolicy.test.ts is
// the launch gate for it.
const contactEmail = 'privacy@example.com';

// The settings screen shows this text, and the owner hosts the same words at the privacy policy URL
// given to both stores. docs/compliance.md says what has to stay true for it to stay accurate.
export const privacyPolicy: PrivacyPolicy = {
  title: 'Privacy policy',
  updated: 'Last updated 19 November 2026',
  contactEmail,
  sections: [
    {
      heading: 'The short version',
      paragraphs: [
        'Get Freak has no accounts, no adverts and no analytics. We do not collect your name, your answers or anything else you put into the app.',
        'Everything you put into the app stays on your phone. We have no server, and we cannot see anything you do in the app.',
      ],
    },
    {
      heading: 'What the app keeps on your phone',
      paragraphs: [
        'The app keeps a few things on your phone so it works the way you left it: that you confirmed you are 18 or over, the names you enter for the two players, and your settings.',
        'If you write your own dares or questions, save favourites, build decks or keep answers, they are kept on your phone in an encrypted store.',
        'If you turn on the app lock, your PIN is kept only in a scrambled form, in the secure storage your phone provides.',
        'None of this is sent to us or to anyone else.',
      ],
    },
    {
      heading: 'What leaves your phone',
      paragraphs: [
        'Nothing that you enter or play. The only thing the app sends is the check for updates, described in the next section.',
        'If you buy something in the app, Apple or Google handles the payment under their own privacy policies. The app asks the store on your phone what you own. We never see your payment details.',
        'If you turn on the reminder, it is scheduled on your phone. No server sends it.',
      ],
    },
    {
      heading: 'Checking for updates',
      paragraphs: [
        'When the app opens, it checks with Expo, the service that delivers app updates, whether a newer version is available. That check sends technical details about the app version and your phone, such as whether it is an iPhone or an Android phone, and a random number made when the app was installed. It also sends a crash report if the app crashed last time.',
        'Like any request over the internet, the check shows Expo your IP address. The app never sends anything you type or play. Expo looks after what it receives under its own privacy policy.',
      ],
    },
    {
      heading: 'Crash reports',
      paragraphs: [
        'The app has no crash reporting service built in, apart from the crash report that the update check sends. If you have chosen in your phone settings to share diagnostics with app developers, Apple or Google may pass us crash reports that do not identify you. You can turn that off in your phone settings at any time.',
      ],
    },
    {
      heading: 'Backups',
      paragraphs: [
        "Your phone's own backup, such as iCloud, Google or a computer backup, may include the app's settings and player names, as with most apps. That backup is kept under your own account, and we cannot see it.",
        'If you write your own dares or questions, or save favourites, decks or answers, they are encrypted with a key that stays on this phone. A backup of them cannot be read on another phone.',
      ],
    },
    {
      heading: 'Removing everything',
      paragraphs: [
        'Clear everything, in Settings, deletes everything the app has stored on your phone and takes the app back to its first screen.',
        'Deleting the app removes everything too.',
        'If you set a PIN or wrote your own cards, a few secure items, such as the PIN, can stay in the iPhone keychain after the app is deleted. If you install the app again, it removes them before it reads anything.',
      ],
    },
    {
      heading: 'Adults only',
      paragraphs: [
        'Get Freak is for adults aged 18 and over. It is not meant for anyone under 18.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'If this policy changes, the new version will be in the app and at the same web address, with a new date at the top.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [`Questions about privacy? Email us at ${contactEmail}.`],
    },
  ],
};
