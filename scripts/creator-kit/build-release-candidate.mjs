import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { BUNDLE_VERSION, EXPORTER_VERSION, createDeterministicTar } from "./build.mjs";
import { validateBundle } from "./validate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function gitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}

function argValue(argv, name, fallback) {
  const index = argv.findIndex((argument) => argument === `--${name}` || argument.startsWith(`--${name}=`));
  if (index === -1) return fallback;
  const argument = argv[index];
  return argument.includes("=") ? argument.slice(argument.indexOf("=") + 1) : argv[index + 1];
}

export async function buildReleaseCandidate({
  bundleRoot = path.join(ROOT, "creator-kit"),
  releaseDir = path.join(ROOT, ".creator-kit-tmp", "release"),
  version = BUNDLE_VERSION,
  sourceCommit = gitHead(),
} = {}) {
  if (version !== BUNDLE_VERSION) throw new Error(`Only the reviewed ${BUNDLE_VERSION} prerelease is authorized`);
  if (!/^[a-f0-9]{40}$/u.test(sourceCommit) || sourceCommit !== gitHead()) {
    throw new Error("Release assets must be built from the exact checked-out Examples commit");
  }
  const validation = await validateBundle(bundleRoot);
  if (validation.bundleVersion !== version) throw new Error("Requested release version does not match the committed bundle");
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });
  const archivePath = path.join(releaseDir, `spectoda-creator-kit-${version}.tar`);
  const archive = await createDeterministicTar(bundleRoot, archivePath, 0);
  await writeFile(`${archivePath}.sha256`, `${archive.sha256}  ${path.basename(archivePath)}\n`, "utf8");
  const sourceLock = JSON.parse(await readFile(path.join(bundleRoot, "source-lock.json"), "utf8"));
  const provenance = {
    schemaVersion: "creator-kit-provenance.v1",
    name: "Spectoda Creator Kit",
    version,
    releaseType: "prerelease",
    publicationStatus: "prepared",
    source: { repository: "Spectoda/examples", commit: sourceCommit },
    documentationSource: sourceLock.documentationBundle,
    packagerVersion: EXPORTER_VERSION,
    bundleDigest: validation.checksumDigest,
    archiveDigest: archive.sha256,
    stableChannelState: validation.stableState,
  };
  await writeFile(path.join(releaseDir, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
  return { validation, archive, provenance, releaseDir };
}

async function main() {
  const argv = process.argv.slice(2);
  const result = await buildReleaseCandidate({
    bundleRoot: argValue(argv, "bundle", path.join(ROOT, "creator-kit")),
    releaseDir: argValue(argv, "release-dir", path.join(ROOT, ".creator-kit-tmp", "release")),
    version: argValue(argv, "version", BUNDLE_VERSION),
    sourceCommit: argValue(argv, "source-commit", gitHead()),
  });
  console.log(JSON.stringify({
    version: result.provenance.version,
    bundleDigest: result.provenance.bundleDigest,
    archiveDigest: result.provenance.archiveDigest,
    archivePath: result.archive.archivePath,
    archiveBytes: result.archive.bytes,
    stableChannelState: result.provenance.stableChannelState,
    releaseType: result.provenance.releaseType,
  }, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Creator Kit release build failed: ${error.message}`);
    process.exitCode = 1;
  });
}
