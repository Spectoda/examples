import { describe, expect, test } from 'bun:test';
import { connect, createServer } from 'node:net';
import { resolve } from 'node:path';
import packageJson from '../package.json';
import viteConfig from '../vite.config';

// Start contract of the Lazurio Module Standard (4.2–4.4), checked the way the
// Launchpad starts the App: only HOME/PATH plus the listener variables.
const app = resolve(import.meta.dir, '..');
const env = { HOME: process.env.HOME ?? '', PATH: process.env.PATH ?? '' };
const [listener] = packageJson.lazurio.runtime.listeners;
const listenerEnv = `LAZURIO_RUNTIME_LISTENER_${listener.id.toUpperCase()}`;

describe('start contract', () => {
  test('the Vite config carries the module-kit shutdown plugin', async () => {
    const config =
      typeof viteConfig === 'function'
        ? await viteConfig({ command: 'build', mode: 'production' })
        : viteConfig;
    const plugins: unknown[] = [config.plugins ?? []].flat(3);
    const names = plugins.map((plugin) =>
      typeof plugin === 'object' && plugin !== null && 'name' in plugin ? plugin.name : undefined,
    );
    expect(names).toContain('lazurio-module-kit-shutdown');
  });

  test('dev refuses to start without the app listener', () => {
    const run = Bun.spawnSync([process.execPath, 'run', packageJson.lazurio.runtime.dev_script], {
      cwd: app,
      env,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(run.exitCode).toBe(2);
    expect(run.stderr.toString()).toContain(`${listenerEnv}_HOST`);
  });

  // The Launchpad runs the declared preparation before it starts the App, so
  // the test does the same. Its health probe does not follow redirects: the
  // declared path itself must answer 200. A requested stop closes the server
  // and its open connections and exits 0.
  test('after the declared preparation, the health path answers 200 directly; SIGTERM with an open connection exits 0', async () => {
    // Examples declares only a check_script: dependency installation is the
    // Platform's part of the preparation and the Vite dev server needs no build.
    const preparation: { prepare_script?: string; check_script: string } =
      packageJson.lazurio.preparation;
    const { prepare_script: prepareScript, check_script: checkScript } = preparation;
    if (prepareScript) {
      const prepare = Bun.spawnSync([process.execPath, 'run', prepareScript], {
        cwd: app,
        env,
        stdout: 'ignore',
        stderr: 'pipe',
      });
      expect(prepare.exitCode, prepare.stderr.toString()).toBe(0);
    }
    expect(Bun.spawnSync([process.execPath, 'run', checkScript], { cwd: app, env }).exitCode).toBe(
      0,
    );

    const port = await freePort();
    const dev = Bun.spawn([process.execPath, 'run', packageJson.lazurio.runtime.dev_script], {
      cwd: app,
      env: { ...env, [`${listenerEnv}_HOST`]: '127.0.0.1', [`${listenerEnv}_PORT`]: `${port}` },
      stdout: 'ignore',
      stderr: 'inherit',
    });
    try {
      const url = `http://127.0.0.1:${port}${listener.health.path}`;
      let response: Response | undefined;
      for (const deadline = Date.now() + 60_000; !response && Date.now() < deadline; ) {
        response = await fetch(url, { redirect: 'manual' }).catch(() => undefined);
        if (!response) await Bun.sleep(250);
      }
      expect(response?.status).toBe(200);

      const idle = await openIdleConnection(port, listener.health.path);
      const started = Date.now();
      dev.kill('SIGTERM');
      const exitCode = await Promise.race([dev.exited, Bun.sleep(9_000).then(() => 'timeout')]);
      idle.destroy();
      expect(exitCode).toBe(0);
      expect(Date.now() - started).toBeLessThan(9_000);
    } finally {
      if (dev.exitCode === null) dev.kill('SIGKILL');
      await dev.exited;
    }
  }, 120_000);
});

// An idle HTTP/1.1 keep-alive connection, as a browser tab leaves behind.
function openIdleConnection(port: number, path: string): Promise<ReturnType<typeof connect>> {
  return new Promise((resolveSocket, reject) => {
    const socket = connect(port, '127.0.0.1', () => {
      socket.write(
        `GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: keep-alive\r\n\r\n`,
      );
      socket.once('data', () => resolveSocket(socket));
    });
    socket.once('error', reject);
  });
}

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() =>
        address && typeof address === 'object'
          ? resolvePort(address.port)
          : reject(new Error('no free port')),
      );
    });
  });
}
