export type LaunchedUpdate = {
  /** True when the app started from the JavaScript built into the installed app. */
  isEmbeddedLaunch: boolean;
  /** The id of the update the app is running, or null when it has none, as in development. */
  updateId: string | null;
};

/** What the app asks the update system. Tests pass a fake one, and the app uses `expo-updates`. */
export type UpdatesDevice = {
  /** What the app launched from, or undefined when that cannot be told. It never throws. */
  getLaunchedUpdate: () => LaunchedUpdate | undefined;
};
