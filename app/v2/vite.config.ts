import { fileURLToPath } from 'node:url';
import { ModuleKitError, viteServerOptions, viteShutdownPlugin } from '@lazurio/module-kit';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The app reads only its own files and the module's data/v2 examples. Keep the
// dev-server filesystem allowlist scoped to exactly those two roots instead of
// the whole modules/ tree.
const appRoot = fileURLToPath(new URL('.', import.meta.url));
const examplesData = fileURLToPath(new URL('../../data/v2', import.meta.url));

// Host and port come only from the Launchpad listener `app` (Lazurio Module
// Standard 4.2); `vite build` has no listener, so it is read only when serving.
// Without the listener environment the App does not start (exit 2).
function appListener() {
  try {
    return viteServerOptions('app');
  } catch (error) {
    if (!(error instanceof ModuleKitError)) throw error;
    console.error(`Start through Lazurio lifecycle: ${error.message}`);
    process.exit(2);
  }
}

export default defineConfig(({ command }) => {
  const listener = command === 'serve' ? appListener() : null;
  // Until module-kit ships the fix (Lazurio/module-kit#2), Vite's own SIGTERM
  // handler would report 143; a requested stop is a clean exit.
  if (listener)
    process.once('SIGTERM', () => {
      process.exitCode = 0;
    });
  return {
    // SIGTERM closes every connection and the server and exits 0 (standard 4.4).
    plugins: [react(), viteShutdownPlugin()],
    // No .env* files on the start path (standard 4.3).
    envDir: false,
    server: {
      ...listener,
      fs: {
        allow: [appRoot, examplesData],
      },
    },
    ...(listener ? { preview: listener } : {}),
  };
});
