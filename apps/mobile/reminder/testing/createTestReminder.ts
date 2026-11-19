import { createInMemoryBackend } from '../../storage/createInMemoryBackend';
import { createStorage } from '../../storage/createStorage';
import { createReminderService } from '../createReminderService';
import { createFakeReminderDevice, type FakeReminderDeviceSetup } from './createFakeReminderDevice';

/**
 * The real reminder service over in-memory storage and a fake phone, so a screen test runs the real
 * rules with nothing native.
 */
export function createTestReminder(setup: FakeReminderDeviceSetup = {}) {
  const backend = createInMemoryBackend();
  const storage = createStorage(backend);
  const fake = createFakeReminderDevice(setup);
  const reminder = createReminderService({ storage, device: fake.device });
  return { reminder, backend, storage, ...fake };
}
