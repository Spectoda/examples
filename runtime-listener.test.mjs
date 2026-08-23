import { expect, test } from "bun:test";
import {
  moduleListener,
  resolveModuleListener,
  withModuleListener,
} from "./runtime-listener.mjs";

test("direct start uses the module-owned lease", () => {
  expect(resolveModuleListener({})).toEqual(moduleListener);
});

test("generic HOST and PORT cannot move the listener", () => {
  expect(resolveModuleListener({ HOST: "0.0.0.0", PORT: "65000" })).toEqual(
    moduleListener,
  );
});

test("Lazurio injection must match the lease", () => {
  expect(
    resolveModuleListener({
      LAZURIO_RUNTIME_LISTENER_APP_HOST: moduleListener.host,
      LAZURIO_RUNTIME_LISTENER_APP_PORT: String(moduleListener.port),
    }),
  ).toEqual(moduleListener);
  expect(() =>
    resolveModuleListener({
      LAZURIO_RUNTIME_LISTENER_APP_HOST: moduleListener.host,
      LAZURIO_RUNTIME_LISTENER_APP_PORT: "65000",
    }),
  ).toThrow("does not match");
});

test("Vite configuration is pinned to the module-owned lease", () => {
  const config = withModuleListener(
    {
      server: { allowedHosts: ["module.example"] },
      preview: { open: false },
    },
    { HOST: "0.0.0.0", PORT: "65000" },
  );

  expect(config.server).toEqual({
    allowedHosts: ["module.example"],
    host: moduleListener.host,
    port: moduleListener.port,
    strictPort: true,
  });
  expect(config.preview).toEqual({
    open: false,
    host: moduleListener.host,
    port: moduleListener.port,
    strictPort: true,
  });
});
