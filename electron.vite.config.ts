import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  main: {},
  preload: {
    // Sandboxed Electron preload scripts run as CommonJS and cannot contain
    // top-level ESM imports. Bundle the bridge into one standalone CJS file.
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs',
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    // Bind to IPv4 so development also works on systems where ::1 is unavailable.
    server: { host: '127.0.0.1' },
  },
});
