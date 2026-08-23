import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("./lazurio.module.json", import.meta.url), "utf8"),
);
const candidate = manifest.port_leases?.find((lease) => lease.id === "main");

if (
  manifest.schema_version !== "lazurio.module.v1" ||
  !candidate ||
  typeof candidate.host !== "string" ||
  !Number.isInteger(candidate.port) ||
  candidate.port < 1024 ||
  candidate.port > 65535
) {
  throw new Error("lazurio.module.json must declare a valid main listener lease.");
}

export const moduleListener = Object.freeze({
  host: candidate.host,
  port: candidate.port,
});

function validatePair(host, rawPort, source) {
  if (host === undefined && rawPort === undefined) return;
  if (!host || !rawPort) {
    throw new Error(`${source} must provide both host and port.`);
  }
  if (host !== moduleListener.host || Number(rawPort) !== moduleListener.port) {
    throw new Error(
      `${source} listener ${host}:${rawPort} does not match the module-owned lease ${moduleListener.host}:${moduleListener.port}.`,
    );
  }
}

export function resolveModuleListener(env = process.env) {
  validatePair(
    env.LAZURIO_RUNTIME_HOST,
    env.LAZURIO_RUNTIME_PORT,
    "Lazurio runtime",
  );
  validatePair(
    env.LAZURIO_RUNTIME_LISTENER_APP_HOST,
    env.LAZURIO_RUNTIME_LISTENER_APP_PORT,
    "Lazurio app listener",
  );
  return moduleListener;
}

export function withModuleListener(config = {}, env = process.env) {
  const listener = resolveModuleListener(env);
  return {
    ...config,
    server: {
      ...(config.server ?? {}),
      host: listener.host,
      port: listener.port,
      strictPort: true,
    },
    preview: {
      ...(config.preview ?? {}),
      host: listener.host,
      port: listener.port,
      strictPort: true,
    },
  };
}
