import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function promoteStableChannel({
  bundleRoot = path.join(ROOT, "creator-kit"),
  version,
  digest,
  releaseUrl,
  outputPath,
  confirmation,
} = {}) {
  if (confirmation !== "PUBLISH_CREATOR_KIT_RELEASE") throw new Error("Stable-channel promotion requires the protected human confirmation");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version ?? "")) throw new Error("Stable-channel promotion requires a semver version");
  if (!/^[a-f0-9]{64}$/u.test(digest ?? "")) throw new Error("Stable-channel promotion requires a 64-character bundle digest");
  if (!/^https:\/\/github\.com\/Spectoda\/examples\/releases\/tag\/creator-kit-v[^/]+$/u.test(releaseUrl ?? "")) throw new Error("Stable-channel release URL must point to a versioned Spectoda/examples GitHub Release");
  const current = JSON.parse(await readFile(path.join(bundleRoot, "stable-channel.json"), "utf8"));
  if (current.state !== "unpublished" || current.requiredHumanApproval !== true) throw new Error("Stable-channel source is not an unpublished human-gated descriptor");
  const next = {
    ...current,
    state: "published",
    version,
    digest,
    releaseUrl,
    rollback: { ...current.rollback, previous: current.version ?? null },
  };
  await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function argValue(argv, name) {
  const index = argv.findIndex((argument) => argument === `--${name}` || argument.startsWith(`--${name}=`));
  if (index === -1) return undefined;
  const argument = argv[index];
  return argument.includes("=") ? argument.slice(argument.indexOf("=") + 1) : argv[index + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  const result = await promoteStableChannel({
    bundleRoot: argValue(argv, "bundle") ?? path.join(ROOT, "creator-kit"),
    version: argValue(argv, "version"),
    digest: argValue(argv, "digest"),
    releaseUrl: argValue(argv, "release-url"),
    outputPath: argValue(argv, "output"),
    confirmation: argValue(argv, "confirm"),
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch((error) => {
  console.error(`Creator Kit stable-channel promotion failed: ${error.message}`);
  process.exitCode = 1;
});
