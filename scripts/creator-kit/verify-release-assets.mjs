import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { BUNDLE_VERSION, sha256 } from "./build.mjs";
import { validateBundle } from "./validate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function argValue(argv, name, fallback) {
  const index = argv.findIndex((argument) => argument === `--${name}` || argument.startsWith(`--${name}=`));
  if (index === -1) return fallback;
  const argument = argv[index];
  return argument.includes("=") ? argument.slice(argument.indexOf("=") + 1) : argv[index + 1];
}

function tarString(buffer) {
  const zero = buffer.indexOf(0);
  return buffer.subarray(0, zero === -1 ? buffer.length : zero).toString("utf8");
}

function tarOctal(buffer, field) {
  const value = tarString(buffer).trim();
  if (!/^[0-7]+$/u.test(value)) throw new Error(`Release archive has an invalid ${field}`);
  return Number.parseInt(value, 8);
}

function safeArchivePath(value) {
  return value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.split("/").includes("..") &&
    path.posix.normalize(value) === value;
}

async function extractReviewedTar(archivePath, destination) {
  const archive = await readFile(archivePath);
  const seen = new Set();
  let offset = 0;
  let terminated = false;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      if (offset + 1024 > archive.length || !archive.subarray(offset + 512, offset + 1024).every((byte) => byte === 0)) {
        throw new Error("Release archive is missing the second end-of-archive block");
      }
      if (!archive.subarray(offset + 1024).every((byte) => byte === 0)) throw new Error("Release archive has trailing data");
      terminated = true;
      break;
    }
    const expectedChecksum = tarOctal(header.subarray(148, 156), "header checksum");
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    const actualChecksum = [...checksumHeader].reduce((total, byte) => total + byte, 0);
    if (expectedChecksum !== actualChecksum) throw new Error("Release archive header checksum is invalid");
    const relative = tarString(header.subarray(0, 100));
    if (!safeArchivePath(relative) || seen.has(relative)) throw new Error(`Release archive has an unsafe or duplicate path: ${relative}`);
    seen.add(relative);
    const type = header[156];
    if (type !== 0 && type !== 0x30) throw new Error(`Release archive has an unsupported entry type: ${relative}`);
    const size = tarOctal(header.subarray(124, 136), "file size");
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > archive.length) throw new Error(`Release archive entry is truncated: ${relative}`);
    const destinationPath = path.join(destination, ...relative.split("/"));
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, archive.subarray(contentStart, contentEnd));
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  if (!terminated) throw new Error("Release archive is missing its end marker");
}

export async function verifyReleaseAssets({
  assetDir,
  version = BUNDLE_VERSION,
  sourceCommit,
  candidateDigest,
  releasedDigest,
} = {}) {
  if (!assetDir) throw new Error("Release asset directory is required");
  if (version !== BUNDLE_VERSION) throw new Error(`Only Creator Kit ${BUNDLE_VERSION} release assets are supported`);
  if (!/^[a-f0-9]{40}$/u.test(sourceCommit ?? "")) throw new Error("Release source commit must be exact");
  if (!/^[a-f0-9]{64}$/u.test(candidateDigest ?? "") || !/^[a-f0-9]{64}$/u.test(releasedDigest ?? "")) {
    throw new Error("Candidate and released bundle digests must be exact SHA-256 values");
  }
  const archiveName = `spectoda-creator-kit-${version}.tar`;
  const archivePath = path.join(assetDir, archiveName);
  const archiveBytes = await readFile(archivePath);
  const archiveDigest = sha256(archiveBytes);
  const sidecar = await readFile(`${archivePath}.sha256`, "utf8");
  if (sidecar !== `${archiveDigest}  ${archiveName}\n`) throw new Error("Release archive SHA-256 sidecar is invalid");
  const provenance = JSON.parse(await readFile(path.join(assetDir, "provenance.json"), "utf8"));
  if (provenance.schemaVersion !== "creator-kit-provenance.v1" || provenance.version !== version || provenance.releaseType !== "release") {
    throw new Error("Release provenance identity is invalid");
  }
  if (provenance.source?.repository !== "Spectoda/examples" || provenance.source.commit !== sourceCommit) {
    throw new Error("Release provenance source commit is invalid");
  }
  if (provenance.candidateBundleDigest !== candidateDigest || provenance.bundleDigest !== releasedDigest) {
    throw new Error("Release provenance bundle digests are invalid");
  }
  if (provenance.archiveDigest !== archiveDigest || provenance.stableChannelState !== "unpublished") {
    throw new Error("Release provenance archive or stable-channel state is invalid");
  }
  const extractionRoot = await mkdtemp(path.join(tmpdir(), "creator-kit-verify-"));
  try {
    await extractReviewedTar(archivePath, extractionRoot);
    const validation = await validateBundle(extractionRoot, { expectedStatus: "released" });
    if (validation.checksumDigest !== releasedDigest) throw new Error("Released archive bundle digest is invalid");
    return { archiveDigest, candidateDigest, releasedDigest, validation, provenance };
  } finally {
    await rm(extractionRoot, { recursive: true, force: true });
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const result = await verifyReleaseAssets({
    assetDir: argValue(argv, "asset-dir", path.join(ROOT, ".creator-kit-tmp", "release")),
    version: argValue(argv, "version", BUNDLE_VERSION),
    sourceCommit: argValue(argv, "source-commit"),
    candidateDigest: argValue(argv, "candidate-digest"),
    releasedDigest: argValue(argv, "released-digest"),
  });
  console.log(JSON.stringify({
    version: result.provenance.version,
    sourceCommit: result.provenance.source.commit,
    candidateBundleDigest: result.candidateDigest,
    releasedBundleDigest: result.releasedDigest,
    archiveDigest: result.archiveDigest,
    bundleStatus: result.validation.bundleStatus,
    stableChannelState: result.validation.stableState,
  }, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Creator Kit release verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
