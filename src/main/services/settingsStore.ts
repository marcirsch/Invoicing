import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  settingsBaseSchema,
  settingsSchema,
} from '../../shared/validation/settingsValidation';
import type { Settings } from '../../shared/domain/settings';
import { defaultSettings } from '../../shared/domain/settingsDefaults';
export { defaultSettings };
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
      const result = settingsBaseSchema.safeParse(raw);
      return result.success ? result.data : defaultSettings;
    } catch {
      return defaultSettings;
    }
  }
  async save(settings: Settings): Promise<Settings> {
    const valid = settingsSchema.parse(settings);
    return this.write(valid);
  }
  async savePreferences(settings: Settings): Promise<Settings> {
    const valid = settingsBaseSchema.parse(settings);
    return this.write(valid);
  }
  private async write(valid: Settings): Promise<Settings> {
    await fs.mkdir(this.userDataPath, { recursive: true });
    const temp = `${this.filePath}.tmp`;
    try {
      await fs.writeFile(temp, JSON.stringify(valid, null, 2), 'utf8');
      if (process.platform === 'win32') {
        const previous = `${this.filePath}.previous`;
        try {
          await fs.rename(this.filePath, previous);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        try {
          await fs.rename(temp, this.filePath);
        } catch (error) {
          await fs.rename(previous, this.filePath).catch(() => undefined);
          throw error;
        }
        await fs.rm(previous, { force: true });
      } else await fs.rename(temp, this.filePath);
    } catch (error) {
      await fs.rm(temp, { force: true }).catch(() => undefined);
      throw error;
    }
    return valid;
  }
}
