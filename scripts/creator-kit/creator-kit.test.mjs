import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { buildReleaseCandidate } from "./build-release-candidate.mjs";
import { CreatorKitBuildError, buildCreatorKitCandidate, sha256 } from "./build.mjs";
import { evaluateAllAgents } from "./evaluate-agents.mjs";
import { promoteStableChannel } from "./promote-stable-channel.mjs";
import { validateBundle } from "./validate.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const FIXTURE_ROOT = path.join(ROOT, "creator-kit-fixtures");
const NEGATIVE_ROOT = path.join(ROOT, "creator-kit-negative-fixtures");

test("double-builds a reproducible candidate and deterministic tar archive", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-examples-"));
  try {
    const first = await buildReleaseCandidate({
      outputDir: path.join(root, "first-bundle"),
      releaseDir: path.join(root, "first-release"),
    });
    const second = await buildReleaseCandidate({
      outputDir: path.join(root, "second-bundle"),
      releaseDir: path.join(root, "second-release"),
    });
    assert.equal(first.validation.checksumDigest, second.validation.checksumDigest);
    assert.equal(first.archive.sha256, second.archive.sha256);
    assert.equal(first.provenance.releaseNotPublished, true);
    assert.equal(first.provenance.stableChannelState, "unpublished");
    assert.equal((await validateBundle(path.join(root, "first-bundle"))).documentCount, 2);
    assert.equal(first.validation.exampleCount, 1);
    const sourcePlugin = await readFile(path.join(ROOT, "data/v2/examples/player-bundle-ab-complete-cue-tracks/player-bundle.be"));
    const bundledPlugin = await readFile(path.join(root, "first-bundle/examples/player-bundle-ab-complete-cue-tracks/player-bundle.be"));
    assert.deepEqual(bundledPlugin, sourcePlugin);
    assert.match(bundledPlugin.toString("utf8"), /timeline[.]at/u);
    assert.doesNotMatch(bundledPlugin.toString("utf8"), /timeline[.]toMillis/u);
    const sourceLock = JSON.parse(await readFile(path.join(root, "first-bundle/source-lock.json"), "utf8"));
    const pluginLock = sourceLock.files.find((file) => file.sourcePath.endsWith("/player-bundle.be"));
    assert.equal(pluginLock.sourceSha256, sha256(sourcePlugin));
    assert.equal(pluginLock.bundleSha256, sha256(bundledPlugin));
    assert.equal(await readFile(first.archive.archivePath).then((value) => value.length), await readFile(second.archive.archivePath).then((value) => value.length));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("agent-objective harness passes Codex and Claude-shaped fixtures without claiming a pilot", async () => {
  const result = await evaluateAllAgents();
  assert.equal(result.passed, true);
  assert.equal(result.pilotStatus, "not-run");
  assert.deepEqual(result.evaluations.map((evaluation) => evaluation.agent), ["codex", "claude"]);
});

test("refuses synthetic sources outside the tracked fixture roots", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-source-boundary-"));
  try {
    await assert.rejects(
      buildCreatorKitCandidate({ sourceRoot: ROOT, outputDir: path.join(root, "out"), includePublicExamples: false }),
      (error) => error instanceof CreatorKitBuildError && error.code === "synthetic_source_required",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects output paths outside the reviewed distribution or temporary directories", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-output-"));
  try {
    await assert.rejects(
      buildCreatorKitCandidate({ sourceRoot: FIXTURE_ROOT, outputDir: ROOT, includePublicExamples: false }),
      (error) => error instanceof CreatorKitBuildError && error.code === "unsafe_output",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stable-channel promotion is human-gated and deterministic", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-stable-"));
  try {
    const candidate = await buildReleaseCandidate({ outputDir: path.join(root, "bundle"), releaseDir: path.join(root, "release") });
    await assert.rejects(
      promoteStableChannel({
        bundleRoot: path.join(root, "bundle"),
        version: "0.1.0-rc.1",
        digest: candidate.validation.checksumDigest,
        releaseUrl: "https://github.com/Spectoda/examples/releases/tag/creator-kit-v0.1.0-rc.1",
        outputPath: path.join(root, "stable-channel.json"),
        confirmation: "",
      }),
      /protected human confirmation/u,
    );
    const stable = await promoteStableChannel({
      bundleRoot: path.join(root, "bundle"),
      version: "0.1.0-rc.1",
      digest: candidate.validation.checksumDigest,
      releaseUrl: "https://github.com/Spectoda/examples/releases/tag/creator-kit-v0.1.0-rc.1",
      outputPath: path.join(root, "stable-channel.json"),
      confirmation: "PUBLISH_CREATOR_KIT_RELEASE",
    });
    assert.equal(stable.state, "published");
    assert.equal(stable.digest, candidate.validation.checksumDigest);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("tracked negative fixtures fail closed for every gate", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-negative-"));
  try {
    const cases = [
      ["secret", "public_safety"],
      ["executable", "executable_mdx"],
      ["executable-html", "executable_html"],
      ["multiline-expression", "executable_mdx"],
      ["multiline-jsx", "executable_mdx"],
      ["multiline-html", "executable_html"],
      ["unsafe-link", "unsafe_link"],
      ["metadata", "public_safety"],
      ["metadata-link", "unsafe_link"],
      ["indented-pseudo-fence", "executable_html"],
      ["invalid-fence", "executable_html"],
      ["multiline-js-url", "unsafe_link"],
      ["reference", "unsafe_link"],
      ["autolink", "unsafe_link"],
      ["html", "unsafe_link"],
      ["srcset", "unsafe_link"],
      ["bare-url", "unsafe_link"],
      ["private-https", "unsafe_link"],
      ["localhost-dot", "unsafe_link"],
      ["resource", "unsafe_link"],
      ["dynamic-resource", "unsafe_link"],
      ["collision", "duplicate_document_id"],
    ];
    for (const [name, code] of cases) {
      await assert.rejects(
        buildCreatorKitCandidate({ sourceRoot: path.join(NEGATIVE_ROOT, name), outputDir: path.join(root, name), includePublicExamples: false }),
        (error) => error instanceof CreatorKitBuildError && error.code === code,
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
