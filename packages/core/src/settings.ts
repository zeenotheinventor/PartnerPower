import { z } from 'zod';

// A boolean is enough: the entry guard only asks whether the player has confirmed.
export const entryConfirmationSchema = z.boolean();
export type EntryConfirmation = z.infer<typeof entryConfirmationSchema>;

export const playerNamesSchema = z.tuple([z.string(), z.string()]);
export type PlayerNames = z.infer<typeof playerNamesSchema>;
