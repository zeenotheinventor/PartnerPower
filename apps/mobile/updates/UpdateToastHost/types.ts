import type { Storage } from '../../storage';
import type { UpdatesDevice } from '../types';

export type UpdateToastHostProps = {
  /** What the app launched from. Tests pass a fake one, and the app uses `expo-updates`. */
  device?: UpdatesDevice;
  /** Where the last announced update is kept. Tests pass an in-memory one. */
  storage?: Storage;
};
