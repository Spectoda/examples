import { execFileSync } from "node:child_process";
import { readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildSyntheticBundle, createDeterministicTar, sha256 } from "./build.mjs";
import { validateBundle } from "./validate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function argValue(argv, name, fallback) {
  const index = argv.findIndex((argument) => argument === `--${name}` || argument.startsWith(`--${name}=`));
  if (index === -1) return fallback;
  const argument = argv[index];
  return argument.includes("=") ? argument.slice(argument.indexOf("=") + 1) : argv[index + 1];
}

export async function buildReleaseCandidate({
  outputDir = path.join(ROOT, "creator-kit"),
  releaseDir = path.join(ROOT, ".creator-kit-tmp", "release"),
  version = "0.1.0-rc.1",
  sourceCommit = gitHead(),
} = {}) {
  const build = await buildSyntheticBundle({ outputDir, version, sourceCommit });
  const validation = await validateBundle(outputDir);
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });
  const archivePath = path.join(releaseDir, `spectoda-creator-kit-${version}.tar`);
  const archive = await createDeterministicTar(outputDir, archivePath, 0);
  await writeFile(`${archivePath}.sha256`, `${archive.sha256}  ${path.basename(archivePath)}\n`, "utf8");
  const provenance = {
    schemaVersion: "creator-kit-provenance.v1",
    name: "Spectoda Creator Kit",
    version,
    status: "candidate",
    releaseNotPublished: true,
    source: {
      repository: "synthetic-fixture",
      commit: sourceCommit,
      examplesCommit: gitHead(),
    },
    exporterVersion: build.exporterVersion,
    bundleDigest: validation.checksumDigest,
    archiveDigest: archive.sha256,
    humanReleaseGate: "creator-kit-release",
    stableChannelState: validation.stableState,
  };
  await writeFile(path.join(releaseDir, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
  return { build, validation, archive, provenance, releaseDir };
}

async function main() {
  const argv = process.argv.slice(2);
  const result = await buildReleaseCandidate({
    outputDir: argValue(argv, "output", path.join(ROOT, "creator-kit")),
    releaseDir: argValue(argv, "release-dir", path.join(ROOT, ".creator-kit-tmp", "release")),
    version: argValue(argv, "version", "0.1.0-rc.1"),
    sourceCommit: argValue(argv, "source-commit", gitHead()),
  });
  console.log(JSON.stringify({
    version: result.provenance.version,
    bundleDigest: result.provenance.bundleDigest,
    archiveDigest: result.provenance.archiveDigest,
    archivePath: result.archive.archivePath,
    stableChannelState: result.provenance.stableChannelState,
    releaseNotPublished: result.provenance.releaseNotPublished,
  }, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Creator Kit release candidate failed: ${error.message}`);
    process.exitCode = 1;
  });
}
