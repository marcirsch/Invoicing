import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  // Electron Vite already owns ./out for its production entry files.
  outDir: 'release',
  packagerConfig: {
    appBundleId: 'ch.localinvoicing.app',
    asar: true,
    icon: 'resources/icons/local-invoicing',
    // Electron Forge ignores /out by default, but electron-vite writes the
    // production main, preload, and renderer entries there.
    ignore: (filePath) => {
      const relativePath = filePath.replaceAll('\\', '/');
      return (
        /^\/out\/(?!main(?:\/|$)|preload(?:\/|$)|renderer(?:\/|$))/.test(
          relativePath,
        ) ||
        /^\/(?:\.agents|\.codex|\.git|docs|scripts|src|tests|resources)(?:\/|$)/.test(
          relativePath,
        ) ||
        /^\/(?:\.gitignore|\.prettierignore|\.prettierrc|README\.md|package-lock\.json|tsconfig(?:\.node)?\.json|electron\.vite\.config\.ts|forge\.config\.ts)$/.test(
          relativePath,
        ) ||
        /\/node_modules\/(?:\.bin|electron)(?:\/|$)/.test(relativePath)
      );
    },
    overwrite: true,
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: { format: 'ULFO' },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
      config: {},
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'LocalInvoicing',
        authors: 'Local Invoicing',
        description: 'Local desktop invoicing for Swiss small businesses',
        setupIcon: 'resources/icons/local-invoicing.ico',
        noMsi: true,
      },
    },
  ],
};

export default config;
