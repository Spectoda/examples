import { expect, test } from "bun:test";
import {
  ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE,
  EXTERNAL_ORIGIN_VARIABLE,
  moduleListener,
  resolveExternalOrigin,
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

const hostedOrigin = "https://module.vm.zone.lazurio.io";

test("local runs keep the lease without an external origin", () => {
  expect(resolveExternalOrigin({})).toBeNull();
  expect(resolveModuleListener({})).toBe(moduleListener);
});

test("hosted runs accept exactly one validated external origin", () => {
  expect(resolveExternalOrigin({ [EXTERNAL_ORIGIN_VARIABLE]: hostedOrigin })).toBe(
    hostedOrigin,
  );
  expect(
    resolveExternalOrigin({ [ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE]: hostedOrigin }),
  ).toBe(hostedOrigin);
  expect(
    resolveExternalOrigin({
      [EXTERNAL_ORIGIN_VARIABLE]: hostedOrigin,
      [ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE]: `${hostedOrigin}/`,
    }),
  ).toBe(hostedOrigin);
  expect(() =>
    resolveExternalOrigin({
      [EXTERNAL_ORIGIN_VARIABLE]: hostedOrigin,
      [ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE]: "https://other.vm.zone.lazurio.io",
    }),
  ).toThrow("must name the same origin");
  expect(
    resolveModuleListener({
      LAZURIO_RUNTIME_HOST: moduleListener.host,
      LAZURIO_RUNTIME_PORT: String(moduleListener.port),
      [EXTERNAL_ORIGIN_VARIABLE]: hostedOrigin,
    }),
  ).toEqual({ ...moduleListener, externalOrigin: hostedOrigin });
});

test("invalid external origins fail closed", () => {
  for (const value of [
    "",
    "module.vm.zone.lazurio.io",
    "http://module.vm.zone.lazurio.io",
    "https://module.vm.zone.lazurio.io:8443",
    "https://user@module.vm.zone.lazurio.io",
    "https://module.vm.zone.lazurio.io/app",
    "https://module.vm.zone.lazurio.io/?next=1",
    "https://Module.vm.zone.lazurio.io",
    "https://127.0.0.1",
    "https://[::1]",
    "https://localhost",
    "https://module.localhost",
    "https://intranet",
  ]) {
    expect(() => resolveExternalOrigin({ [EXTERNAL_ORIGIN_VARIABLE]: value })).toThrow(
      EXTERNAL_ORIGIN_VARIABLE,
    );
    expect(() =>
      resolveExternalOrigin({ [ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE]: value }),
    ).toThrow(ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE);
  }
});

test("hosted Vite configuration adds only the external host", () => {
  const config = withModuleListener(
    {
      server: { allowedHosts: ["module.example"] },
      preview: { open: false },
    },
    { [EXTERNAL_ORIGIN_VARIABLE]: hostedOrigin },
  );

  expect(config.server).toEqual({
    allowedHosts: ["module.example", "module.vm.zone.lazurio.io"],
    host: moduleListener.host,
    port: moduleListener.port,
    strictPort: true,
  });
  expect(config.preview).toEqual({
    open: false,
    allowedHosts: ["module.example", "module.vm.zone.lazurio.io"],
    host: moduleListener.host,
    port: moduleListener.port,
    strictPort: true,
  });
  expect(
    withModuleListener({}, { [ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE]: hostedOrigin })
      .server.allowedHosts,
  ).toEqual(["module.vm.zone.lazurio.io"]);
  expect(() =>
    withModuleListener(
      { server: { allowedHosts: "module.example" } },
      { [EXTERNAL_ORIGIN_VARIABLE]: hostedOrigin },
    ),
  ).toThrow("allowedHosts");
});
