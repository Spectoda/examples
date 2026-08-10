import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { buildReleaseCandidate } from "./build-release-candidate.mjs";
import { createChecksums, sha256, verifyChecksums } from "./build.mjs";
import { evaluateAllAgents } from "./evaluate-agents.mjs";
import { importDocumentationSnapshot } from "./import-documentation-snapshot.mjs";
import { promoteStableChannel } from "./promote-stable-channel.mjs";
import { validateBundle } from "./validate.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const BUNDLE_ROOT = path.join(ROOT, "creator-kit");
const TEST_DOCUMENT_PATH = "documents/en/pro-vyrobce-a-tvurce/controller-config/index.md";

async function replaceDocumentAndRehash(bundle, content) {
  await writeFile(path.join(bundle, TEST_DOCUMENT_PATH), content, "utf8");
  const digest = sha256(Buffer.from(content));
  const manifestPath = path.join(bundle, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const document = manifest.documents.find((entry) => entry.path === TEST_DOCUMENT_PATH);
  document.sha256 = digest;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const sourceLockPath = path.join(bundle, "source-lock.json");
  const sourceLock = JSON.parse(await readFile(sourceLockPath, "utf8"));
  const lock = sourceLock.files.find((entry) => `documents/${entry.sourcePath}` === TEST_DOCUMENT_PATH);
  lock.normalizedSha256 = digest;
  await writeFile(sourceLockPath, `${JSON.stringify(sourceLock, null, 2)}\n`, "utf8");
  const indexPath = path.join(bundle, "indexes/documents.json");
  const documentIndex = JSON.parse(await readFile(indexPath, "utf8"));
  documentIndex.documents.find((entry) => entry.path === TEST_DOCUMENT_PATH).sha256 = digest;
  await writeFile(indexPath, `${JSON.stringify(documentIndex, null, 2)}\n`, "utf8");
  await writeFile(path.join(bundle, "checksums.sha256"), await createChecksums(bundle), "utf8");
}

test("validates the committed licensed Creator Kit snapshot", async () => {
  const result = await validateBundle(BUNDLE_ROOT);
  assert.equal(result.bundleVersion, "0.1.0-rc.4");
  assert.equal(result.documentCount, 7);
  assert.equal(result.assetCount, 2);
  assert.equal(result.exampleCount, 1);
  assert.equal(result.stableState, "unpublished");
  assert.ok(result.totalBytes <= 8 * 1024 * 1024);
});

test("double-builds a deterministic prerelease archive without mutating the snapshot", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-release-"));
  try {
    const first = await buildReleaseCandidate({ releaseDir: path.join(root, "first") });
    const second = await buildReleaseCandidate({ releaseDir: path.join(root, "second") });
    assert.equal(first.archive.sha256, second.archive.sha256);
    assert.equal(first.provenance.bundleDigest, second.provenance.bundleDigest);
    assert.equal(first.provenance.releaseType, "prerelease");
    assert.equal(first.provenance.stableChannelState, "unpublished");
    assert.equal(first.provenance.documentationSource.commit, "08cb4e5f8155178c18a86edd4a515f7d6c8fb835");
    assert.deepEqual(await readFile(first.archive.archivePath), await readFile(second.archive.archivePath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed when the committed snapshot is tampered", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-tamper-"));
  try {
    const bundle = path.join(root, "bundle");
    await cp(BUNDLE_ROOT, bundle, { recursive: true });
    await writeFile(path.join(bundle, "documents/en/pro-vyrobce-a-tvurce/controller-config/index.md"), "tampered\n", "utf8");
    await assert.rejects(validateBundle(bundle), /reviewed Documentation hash|checksums[.]sha256/u);
    await assert.rejects(verifyChecksums(bundle), /does not match/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a rehashed but unauthorized firmware semantic revision", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-revision-"));
  try {
    const bundle = path.join(root, "bundle");
    await cp(BUNDLE_ROOT, bundle, { recursive: true });
    const manifestPath = path.join(bundle, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    for (const asset of manifest.assets) asset.upstreamSource.revisionCommit = "0".repeat(40);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    const sourceLockPath = path.join(bundle, "source-lock.json");
    const sourceLock = JSON.parse(await readFile(sourceLockPath, "utf8"));
    for (const asset of sourceLock.assets) asset.upstreamRevisionCommit = "0".repeat(40);
    await writeFile(sourceLockPath, `${JSON.stringify(sourceLock, null, 2)}\n`, "utf8");
    await writeFile(path.join(bundle, "checksums.sha256"), await createChecksums(bundle), "utf8");
    await assert.rejects(validateBundle(bundle), /firmware provenance/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects credential assignments and bare non-public URLs after valid rehashing", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-public-safety-"));
  try {
    const credentialBundle = path.join(root, "credential");
    await cp(BUNDLE_ROOT, credentialBundle, { recursive: true });
    await replaceDocumentAndRehash(credentialBundle, "# Unsafe\n\npassword: abcdefghijklmnopqrstuvwxyz\n");
    await assert.rejects(validateBundle(credentialBundle), /public-safety validation/u);

    const linkBundle = path.join(root, "link");
    await cp(BUNDLE_ROOT, linkBundle, { recursive: true });
    await replaceDocumentAndRehash(linkBundle, "# Unsafe\n\nVisit https://service.internal/private for details.\n");
    await assert.rejects(validateBundle(linkBundle), /private or unsupported URL/u);

    const metadataBundle = path.join(root, "metadata");
    await cp(BUNDLE_ROOT, metadataBundle, { recursive: true });
    const manifestPath = path.join(metadataBundle, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.documents[0].title = "token: abcdefghijklmnopqrstuvwxyz";
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await writeFile(path.join(metadataBundle, "checksums.sha256"), await createChecksums(metadataBundle), "utf8");
    await assert.rejects(validateBundle(metadataBundle), /public-safety validation/u);

    const executableBundle = path.join(root, "executable");
    await cp(BUNDLE_ROOT, executableBundle, { recursive: true });
    await replaceDocumentAndRehash(executableBundle, "# Unsafe\n\n<script>alert(1)</script>\n");
    await assert.rejects(validateBundle(executableBundle), /executable Markdown\/MDX content/u);

    const rehashedBundle = path.join(root, "rehashed");
    await cp(BUNDLE_ROOT, rehashedBundle, { recursive: true });
    await replaceDocumentAndRehash(rehashedBundle, "# Harmless but unauthorized rewrite\n");
    await assert.rejects(validateBundle(rehashedBundle), /reviewed Documentation hash/u);

    const extraFileBundle = path.join(root, "extra-file");
    await cp(BUNDLE_ROOT, extraFileBundle, { recursive: true });
    await writeFile(path.join(extraFileBundle, "unselected-private-note.txt"), "not selected for publication\n", "utf8");
    await writeFile(path.join(extraFileBundle, "checksums.sha256"), await createChecksums(extraFileBundle), "utf8");
    await assert.rejects(validateBundle(extraFileBundle), /unmanifested or missing file/u);

    const readmeBundle = path.join(root, "readme-secret");
    await cp(BUNDLE_ROOT, readmeBundle, { recursive: true });
    await writeFile(path.join(readmeBundle, "README.md"), "api_key: abcdefghijklmnopqrstuvwxyz\n", "utf8");
    await writeFile(path.join(readmeBundle, "checksums.sha256"), await createChecksums(readmeBundle), "utf8");
    await assert.rejects(validateBundle(readmeBundle), /whole-bundle public-safety validation/u);

    const releaseNotesBundle = path.join(root, "release-notes-url");
    await cp(BUNDLE_ROOT, releaseNotesBundle, { recursive: true });
    await writeFile(path.join(releaseNotesBundle, "RELEASE_NOTES.md"), "Public prerelease: https://release.internal/secret\n", "utf8");
    await writeFile(path.join(releaseNotesBundle, "checksums.sha256"), await createChecksums(releaseNotesBundle), "utf8");
    await assert.rejects(validateBundle(releaseNotesBundle), /private or unsupported URL/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects executable public Markdown and decoded JSON safety bypasses after rehashing", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-decoded-safety-"));
  try {
    const readmeBundle = path.join(root, "root-readme-executable");
    await cp(BUNDLE_ROOT, readmeBundle, { recursive: true });
    await writeFile(path.join(readmeBundle, "README.md"), "# Unsafe\n\n<script>alert(1)</script>\n", "utf8");
    await writeFile(path.join(readmeBundle, "checksums.sha256"), await createChecksums(readmeBundle), "utf8");
    await assert.rejects(validateBundle(readmeBundle), /executable Markdown\/MDX content/u);

    const exampleReadmeBundle = path.join(root, "example-readme-executable");
    await cp(BUNDLE_ROOT, exampleReadmeBundle, { recursive: true });
    await writeFile(
      path.join(exampleReadmeBundle, `examples/player-show-global-sparse-cues/README.md`),
      "# Unsafe\n\n<iframe src=\"https://example.com\"></iframe>\n",
      "utf8",
    );
    await writeFile(path.join(exampleReadmeBundle, "checksums.sha256"), await createChecksums(exampleReadmeBundle), "utf8");
    await assert.rejects(validateBundle(exampleReadmeBundle), /executable Markdown\/MDX content/u);

    const escapedUrlBundle = path.join(root, "escaped-private-url");
    await cp(BUNDLE_ROOT, escapedUrlBundle, { recursive: true });
    const urlSchemaPath = path.join(escapedUrlBundle, "schemas/creator-kit-policy.v1.schema.json");
    const urlSchema = JSON.parse(await readFile(urlSchemaPath, "utf8"));
    urlSchema.$id = "https://127.0.0.1/private-policy";
    await writeFile(urlSchemaPath, `${JSON.stringify(urlSchema, null, 2).replaceAll("/", "\\/")}\n`, "utf8");
    await writeFile(path.join(escapedUrlBundle, "checksums.sha256"), await createChecksums(escapedUrlBundle), "utf8");
    await assert.rejects(validateBundle(escapedUrlBundle), /private or unsupported URL after JSON decoding/u);

    const escapedCredentialBundle = path.join(root, "escaped-credential");
    await cp(BUNDLE_ROOT, escapedCredentialBundle, { recursive: true });
    const credentialSchemaPath = path.join(escapedCredentialBundle, "schemas/creator-kit-policy.v1.schema.json");
    const credentialSchema = JSON.parse(await readFile(credentialSchemaPath, "utf8"));
    credentialSchema.$comment = "token: abcdefghijklmnopqrstuvwxyz";
    const encodedCredentialSchema = JSON.stringify(credentialSchema, null, 2).replace("token:", "\\u0074oken:");
    await writeFile(credentialSchemaPath, `${encodedCredentialSchema}\n`, "utf8");
    await writeFile(path.join(escapedCredentialBundle, "checksums.sha256"), await createChecksums(escapedCredentialBundle), "utf8");
    await assert.rejects(validateBundle(escapedCredentialBundle), /public-safety validation after JSON decoding/u);

    const credentialArrayBundle = path.join(root, "credential-array");
    await cp(BUNDLE_ROOT, credentialArrayBundle, { recursive: true });
    const credentialArraySchemaPath = path.join(credentialArrayBundle, "schemas/creator-kit-policy.v1.schema.json");
    const credentialArraySchema = JSON.parse(await readFile(credentialArraySchemaPath, "utf8"));
    credentialArraySchema.token = ["abcdefghijklmnopqrstuvwxyz"];
    await writeFile(credentialArraySchemaPath, `${JSON.stringify(credentialArraySchema, null, 2)}\n`, "utf8");
    await writeFile(path.join(credentialArrayBundle, "checksums.sha256"), await createChecksums(credentialArrayBundle), "utf8");
    await assert.rejects(validateBundle(credentialArrayBundle), /public-safety validation after JSON decoding/u);

    const nestedCredentialBundle = path.join(root, "nested-credential");
    await cp(BUNDLE_ROOT, nestedCredentialBundle, { recursive: true });
    const nestedCredentialSchemaPath = path.join(nestedCredentialBundle, "schemas/creator-kit-policy.v1.schema.json");
    const nestedCredentialSchema = JSON.parse(await readFile(nestedCredentialSchemaPath, "utf8"));
    nestedCredentialSchema.token = { examples: ["abcdefghijklmnopqrstuvwxyz"] };
    await writeFile(nestedCredentialSchemaPath, `${JSON.stringify(nestedCredentialSchema, null, 2)}\n`, "utf8");
    await writeFile(path.join(nestedCredentialBundle, "checksums.sha256"), await createChecksums(nestedCredentialBundle), "utf8");
    await assert.rejects(validateBundle(nestedCredentialBundle), /public-safety validation after JSON decoding/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("documentation import requires an explicit private snapshot input", async () => {
  await assert.rejects(importDocumentationSnapshot(), /documentation-bundle is required/u);
});

test("agent-objective harness passes Codex and Claude-shaped public-bundle fixtures", async () => {
  const result = await evaluateAllAgents();
  assert.equal(result.passed, true);
  assert.deepEqual(result.evaluations.map((evaluation) => evaluation.agent), ["codex", "claude"]);
});

test("stable-channel promotion remains separately human-gated", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-stable-"));
  try {
    const validation = await validateBundle(BUNDLE_ROOT);
    await assert.rejects(
      promoteStableChannel({
        bundleRoot: BUNDLE_ROOT,
        version: "0.1.0-rc.4",
        digest: validation.checksumDigest,
        releaseUrl: "https://github.com/Spectoda/examples/releases/tag/creator-kit-v0.1.0-rc.4",
        outputPath: path.join(root, "stable-channel.json"),
        confirmation: "",
      }),
      /protected human confirmation/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
