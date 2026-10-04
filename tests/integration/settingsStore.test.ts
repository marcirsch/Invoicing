import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  defaultSettings,
  SettingsStore,
} from '../../src/main/services/settingsStore';

const directories: string[] = [];
async function tempDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'invoice-settings-'));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('SettingsStore', () => {
  it('returns defaults when there is no persisted settings file', async () => {
    const store = new SettingsStore(await tempDirectory());
    expect(await store.load()).toEqual(defaultSettings);
  });
  it('persists validated settings across a store reload', async () => {
    const directory = await tempDirectory();
    const store = new SettingsStore(directory);
    const settings = {
      ...defaultSettings,
      company: {
        ...defaultSettings.company,
        name: 'Atelier Example',
        address: {
          street: 'Rue',
          buildingNumber: '1',
          postalCode: '8000',
          city: 'Zürich',
          country: 'Switzerland',
        },
      },
      currency: 'EUR' as const,
      appearance: 'dark' as const,
    };
    await store.save(settings);
    expect(await new SettingsStore(directory).load()).toEqual(settings);
    expect(
      JSON.parse(await readFile(path.join(directory, 'settings.json'), 'utf8')),
    ).toEqual(settings);
  });
  it('returns defaults for malformed or invalid persisted JSON', async () => {
    const directory = await tempDirectory();
    const file = path.join(directory, 'settings.json');
    await writeFile(file, '{broken');
    expect(await new SettingsStore(directory).load()).toEqual(defaultSettings);
    await writeFile(file, JSON.stringify({ company: {} }));
    expect(await new SettingsStore(directory).load()).toEqual(defaultSettings);
  });
  it('rejects invalid values without replacing saved settings', async () => {
    const directory = await tempDirectory();
    const store = new SettingsStore(directory);
    const original = {
      ...defaultSettings,
      company: {
        ...defaultSettings.company,
        name: 'Original',
        address: {
          street: 'Rue',
          buildingNumber: '1',
          postalCode: '8000',
          city: 'Zürich',
          country: 'Switzerland',
        },
      },
    };
    await store.save(original);
    await expect(
      store.save({ ...original, paymentTermDays: -1 }),
    ).rejects.toThrow();
    expect(await store.load()).toEqual(original);
  });
});
