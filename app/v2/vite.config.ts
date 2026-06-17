import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The app reads only its own files and the module's data/v2 examples. Keep the
// dev-server filesystem allowlist scoped to exactly those two roots instead of
// the whole modules/ tree.
const appRoot = fileURLToPath(new URL('.', import.meta.url));
const examplesData = fileURLToPath(new URL('../../data/v2', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['examples.launchpad.spectoda.com'],
    fs: {
      allow: [appRoot, examplesData],
    },
  },
});
