import { z } from 'zod';

// A boolean is enough: the entry guard only asks whether the player has confirmed.
export const entryConfirmationSchema = z.boolean();
export type EntryConfirmation = z.infer<typeof entryConfirmationSchema>;

export const playerNamesSchema = z.tuple([z.string(), z.string()]);
export type PlayerNames = z.infer<typeof playerNamesSchema>;

// The press feedback switches. Both are on until the player turns them off.
export const soundOnSchema = z.boolean();
export const hapticsOnSchema = z.boolean();

/** Whether Drink If keeps what both partners saw. On until the owner decides otherwise (FRK-33). */
export const defaultSaveDiscoveries = true;

export const questionPreferencesSchema = z.object({ saveDiscoveries: z.boolean() });
export type QuestionPreferences = z.infer<typeof questionPreferencesSchema>;

// The id of the last over-the-air update the player was told about, so each update is announced once.
export const lastShownUpdateIdSchema = z.string();

/** Match phone follows the phone's own light or dark setting. Light and dark ignore it (FRK-89). */
export const appearanceChoices = ['system', 'light', 'dark'] as const;
export const appearanceSchema = z.enum(appearanceChoices);
export type Appearance = z.infer<typeof appearanceSchema>;
export const defaultAppearance: Appearance = 'system';
