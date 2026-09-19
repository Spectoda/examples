import { readFileSync } from "node:fs";
import { isIP } from "node:net";

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

// Hosted profile (decision 0146): the hosted Launchpad hands the entrypoint
// listener its public browser origin, e.g. https://<module>.<vm>.<zone>.lazurio.io.
// The listener-keyed variable wins; the generic entrypoint alias is the
// fallback. Local runs never see either variable and the bind never changes.
export const EXTERNAL_ORIGIN_VARIABLE =
  "LAZURIO_RUNTIME_LISTENER_APP_EXTERNAL_ORIGIN";
export const ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE =
  "LAZURIO_RUNTIME_EXTERNAL_ORIGIN";

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const dnsHostnamePattern =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

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

function isLoopbackHostname(hostname) {
  return (
    loopbackHosts.has(hostname) ||
    hostname.endsWith(".localhost") ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

function parseExternalOrigin(rawValue, variable) {
  const value = String(rawValue).trim();
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `${variable} must be an absolute https origin such as https://<module>.<vm>.<zone>.lazurio.io.`,
    );
  }
  if (
    url.protocol !== "https:" ||
    url.port !== "" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (value !== url.origin && value !== `${url.origin}/`)
  ) {
    throw new Error(
      `${variable} must be a clean https origin without port, credentials, path, query, fragment or uppercase host.`,
    );
  }
  if (
    isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0 ||
    !dnsHostnamePattern.test(url.hostname) ||
    isLoopbackHostname(url.hostname)
  ) {
    throw new Error(
      `${variable} must use a public lowercase DNS hostname, not an IP literal or loopback host.`,
    );
  }
  return url.origin;
}

// Returns the validated external origin, or null when the run is local.
// Any present-but-invalid value fails closed; so do disagreeing variables.
export function resolveExternalOrigin(env = process.env) {
  const listenerValue = env[EXTERNAL_ORIGIN_VARIABLE];
  const entrypointValue = env[ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE];
  const listenerOrigin =
    listenerValue === undefined
      ? null
      : parseExternalOrigin(listenerValue, EXTERNAL_ORIGIN_VARIABLE);
  const entrypointOrigin =
    entrypointValue === undefined
      ? null
      : parseExternalOrigin(entrypointValue, ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE);
  if (listenerOrigin && entrypointOrigin && listenerOrigin !== entrypointOrigin) {
    throw new Error(
      `${EXTERNAL_ORIGIN_VARIABLE} and ${ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE} must name the same origin.`,
    );
  }
  return listenerOrigin ?? entrypointOrigin;
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
  const externalOrigin = resolveExternalOrigin(env);
  if (externalOrigin === null) return moduleListener;
  return Object.freeze({ ...moduleListener, externalOrigin });
}

function withAllowedHost(allowedHosts, hostname, source) {
  if (allowedHosts === true) return true;
  if (allowedHosts === undefined || allowedHosts === null) return [hostname];
  if (!Array.isArray(allowedHosts)) {
    throw new Error(`${source}.allowedHosts must be an array or true.`);
  }
  return allowedHosts.includes(hostname)
    ? [...allowedHosts]
    : [...allowedHosts, hostname];
}

// Vite only answers requests whose Host header it trusts. Behind the hosted
// gateway that header is the external hostname, so it is added to the
// module's existing allowed hosts (preview inherits server hosts exactly like
// Vite does). The hostname comes only from the validated environment, never
// from a request. Without an external origin the config is returned as is.
export function withExternalOrigin(config = {}, listener) {
  if (!listener?.externalOrigin) return config;
  const hostname = new URL(listener.externalOrigin).hostname;
  return {
    ...config,
    server: {
      ...(config.server ?? {}),
      allowedHosts: withAllowedHost(
        config.server?.allowedHosts,
        hostname,
        "server",
      ),
    },
    preview: {
      ...(config.preview ?? {}),
      allowedHosts: withAllowedHost(
        config.preview?.allowedHosts ?? config.server?.allowedHosts,
        hostname,
        "preview",
      ),
    },
  };
}

export function withModuleListener(config = {}, env = process.env) {
  const listener = resolveModuleListener(env);
  return withExternalOrigin(
    {
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
    },
    listener,
  );
}
