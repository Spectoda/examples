import { fileURLToPath } from 'node:url';
import { ModuleKitError, onShutdown, viteServerOptions } from '@lazurio/module-kit';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

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

// SIGTERM closes the server and exits 0 (standard 4.4). Vite closes the dev
// server on SIGTERM by itself but reports 128 + signal; a requested stop is a
// clean exit, so the exit code is set before Vite's close finishes.
function shutdownOnSigterm(): Plugin {
  const stop = (server: { close(): Promise<void> }) => {
    process.once('SIGTERM', () => {
      process.exitCode = 0;
    });
    onShutdown(() => server.close());
  };
  return {
    name: 'lazurio-shutdown',
    configureServer: stop,
    configurePreviewServer: stop,
  };
}

export default defineConfig(({ command }) => {
  const listener = command === 'serve' ? appListener() : null;
  return {
    plugins: [react(), shutdownOnSigterm()],
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
