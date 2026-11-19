import { z } from 'zod';

// A boolean is enough: the entry guard only asks whether the player has confirmed.
export const entryConfirmationSchema = z.boolean();
export type EntryConfirmation = z.infer<typeof entryConfirmationSchema>;

export const playerNamesSchema = z.tuple([z.string(), z.string()]);
export type PlayerNames = z.infer<typeof playerNamesSchema>;

// The press feedback switches. Both are on until the player turns them off.
export const soundOnSchema = z.boolean();
export const hapticsOnSchema = z.boolean();

// The id of the last over-the-air update the player was told about, so each update is announced once.
export const lastShownUpdateIdSchema = z.string();
