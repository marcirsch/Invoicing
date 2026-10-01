import { promises as fs } from 'node:fs';
import path from 'node:path';
import { settingsSchema } from '../../shared/validation/settingsValidation';
import type { Settings } from '../../shared/domain/settings';
export const defaultSettings: Settings = {
  company: {
    name: '',
    address: {
      street: '',
      buildingNumber: '',
      postalCode: '',
      city: '',
      country: 'Switzerland',
    },
    phone: '',
    email: '',
  },
  csvPath: null,
  archivePath: null,
  currency: 'CHF',
  paymentTermDays: 30,
  invoicePrefix: 'RE-',
  invoiceYear: String(new Date().getFullYear()),
  nextSequence: 1,
  template: 'default',
  appearance: 'system',
};
export class SettingsStore {
  constructor(private readonly userDataPath: string) {}
  private get filePath(): string {
    return path.join(this.userDataPath, 'settings.json');
  }
  async load(): Promise<Settings> {
    try {
      const raw = JSON.parse(
        await fs.readFile(this.filePath, 'utf8'),
      ) as unknown;
      const result = settingsSchema.safeParse(raw);
      return result.success ? result.data : defaultSettings;
    } catch {
      return defaultSettings;
    }
  }
  async save(settings: Settings): Promise<Settings> {
    const valid = settingsSchema.parse(settings);
    await fs.mkdir(this.userDataPath, { recursive: true });
    const temp = `${this.filePath}.tmp`;
    await fs.writeFile(temp, JSON.stringify(valid, null, 2), 'utf8');
    await fs.rename(temp, this.filePath);
    return valid;
  }
}
