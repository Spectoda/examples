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
import { verifyReleaseAssets } from "./verify-release-assets.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const BUNDLE_ROOT = path.join(ROOT, "creator-kit");
const TEST_DOCUMENT_PATH = "documents/en/pro-vyrobce-a-tvurce/controller-config/index.md";

async function rewriteArchiveTrust(assetDir, archiveBytes) {
  const archiveName = "spectoda-creator-kit-0.1.0.tar";
  const archiveDigest = sha256(archiveBytes);
  await writeFile(path.join(assetDir, archiveName), archiveBytes);
  await writeFile(path.join(assetDir, `${archiveName}.sha256`), `${archiveDigest}  ${archiveName}\n`, "utf8");
  const provenancePath = path.join(assetDir, "provenance.json");
  const provenance = JSON.parse(await readFile(provenancePath, "utf8"));
  provenance.archiveDigest = archiveDigest;
  await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
}

function rewriteFirstTarPath(archive, relative) {
  archive.fill(0, 0, 100);
  Buffer.from(relative).copy(archive, 0);
  archive.fill(0x20, 148, 156);
  const checksum = [...archive.subarray(0, 512)].reduce((total, byte) => total + byte, 0);
  Buffer.from(`${checksum.toString(8).padStart(6, "0")}\0 `).copy(archive, 148);
}

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
  assert.equal(result.bundleVersion, "0.1.0");
  assert.equal(result.documentCount, 7);
  assert.equal(result.assetCount, 2);
  assert.equal(result.exampleCount, 1);
  assert.equal(result.bundleStatus, "candidate");
  assert.equal(result.stableState, "unpublished");
  assert.ok(result.totalBytes <= 8 * 1024 * 1024);
});

test("double-builds a deterministic stable release archive without mutating the snapshot", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-release-"));
  try {
    const first = await buildReleaseCandidate({ releaseDir: path.join(root, "first") });
    const second = await buildReleaseCandidate({ releaseDir: path.join(root, "second") });
    assert.equal(first.archive.sha256, second.archive.sha256);
    assert.equal(first.provenance.bundleDigest, second.provenance.bundleDigest);
    assert.equal(first.provenance.candidateBundleDigest, first.candidateValidation.checksumDigest);
    assert.equal(first.provenance.bundleDigest, first.releasedValidation.checksumDigest);
    assert.notEqual(first.provenance.candidateBundleDigest, first.provenance.bundleDigest);
    assert.equal(first.candidateValidation.bundleStatus, "candidate");
    assert.equal(first.releasedValidation.bundleStatus, "released");
    assert.equal(first.provenance.releaseType, "release");
    assert.equal(first.provenance.stableChannelState, "unpublished");
    assert.equal(first.provenance.documentationSource.commit, "67827bf5d2680de8bbb7a3a7e73773441669cbf3");
    assert.deepEqual(await readFile(first.archive.archivePath), await readFile(second.archive.archivePath));
    const verified = await verifyReleaseAssets({
      assetDir: path.join(root, "first"),
      sourceCommit: first.provenance.source.commit,
      candidateDigest: first.provenance.candidateBundleDigest,
      releasedDigest: first.provenance.bundleDigest,
    });
    assert.equal(verified.validation.bundleStatus, "released");
    assert.equal((JSON.parse(await readFile(path.join(BUNDLE_ROOT, "bundle.json"), "utf8"))).status, "candidate");
    await assert.rejects(
      buildReleaseCandidate({
        releaseDir: path.join(root, "digest-mismatch"),
        expectedCandidateDigest: "0".repeat(64),
      }),
      /candidate bundle digest does not match/u,
    );
    await assert.rejects(
      buildReleaseCandidate({
        releaseDir: path.join(root, "released-digest-mismatch"),
        expectedCandidateDigest: first.provenance.candidateBundleDigest,
        expectedReleasedDigest: "0".repeat(64),
      }),
      /Released bundle digest does not match/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release verification rejects unsafe tar paths and a mismatched released digest", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "creator-kit-release-negative-"));
  try {
    const originalDir = path.join(root, "original");
    const built = await buildReleaseCandidate({ releaseDir: originalDir });
    const verification = {
      sourceCommit: built.provenance.source.commit,
      candidateDigest: built.provenance.candidateBundleDigest,
      releasedDigest: built.provenance.bundleDigest,
    };

    const unsafeDir = path.join(root, "unsafe-path");
    await cp(originalDir, unsafeDir, { recursive: true });
    const unsafeArchive = Buffer.from(await readFile(path.join(unsafeDir, "spectoda-creator-kit-0.1.0.tar")));
    rewriteFirstTarPath(unsafeArchive, "../escape");
    await rewriteArchiveTrust(unsafeDir, unsafeArchive);
    await assert.rejects(
      verifyReleaseAssets({ assetDir: unsafeDir, ...verification }),
      /unsafe or duplicate path/u,
    );

    const digestDir = path.join(root, "released-digest");
    await cp(originalDir, digestDir, { recursive: true });
    const provenancePath = path.join(digestDir, "provenance.json");
    const provenance = JSON.parse(await readFile(provenancePath, "utf8"));
    provenance.bundleDigest = "0".repeat(64);
    await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
    await assert.rejects(
      verifyReleaseAssets({ assetDir: digestDir, ...verification, releasedDigest: "0".repeat(64) }),
      /Released archive bundle digest is invalid/u,
    );
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

    const placeholderBundle = path.join(root, "unresolved-template-placeholder");
    await cp(BUNDLE_ROOT, placeholderBundle, { recursive: true });
    await writeFile(path.join(placeholderBundle, "README.md"), "# Creator Kit {{DOCUMENTATION_COMMIT}}\n", "utf8");
    await writeFile(path.join(placeholderBundle, "checksums.sha256"), await createChecksums(placeholderBundle), "utf8");
    await assert.rejects(validateBundle(placeholderBundle), /unresolved template placeholder/u);

    const wrongReadmeCommitBundle = path.join(root, "wrong-readme-commit");
    await cp(BUNDLE_ROOT, wrongReadmeCommitBundle, { recursive: true });
    const lockedDocumentationCommit = JSON.parse(
      await readFile(path.join(wrongReadmeCommitBundle, "source-lock.json"), "utf8"),
    ).commit;
    const wrongReadme = (await readFile(path.join(wrongReadmeCommitBundle, "README.md"), "utf8"))
      .replace(lockedDocumentationCommit, "0".repeat(40));
    await writeFile(path.join(wrongReadmeCommitBundle, "README.md"), wrongReadme, "utf8");
    await writeFile(path.join(wrongReadmeCommitBundle, "checksums.sha256"), await createChecksums(wrongReadmeCommitBundle), "utf8");
    await assert.rejects(validateBundle(wrongReadmeCommitBundle), /README Documentation source commit is invalid/u);

    const releaseNotesBundle = path.join(root, "release-notes-url");
    await cp(BUNDLE_ROOT, releaseNotesBundle, { recursive: true });
    await writeFile(path.join(releaseNotesBundle, "RELEASE_NOTES.md"), "Public stable release: https://release.internal/secret\n", "utf8");
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

    const inlineLinkBundle = path.join(root, "root-readme-inline-executable-link");
    await cp(BUNDLE_ROOT, inlineLinkBundle, { recursive: true });
    await writeFile(path.join(inlineLinkBundle, "README.md"), "# Unsafe\n\n[Run](javascript:alert(1))\n", "utf8");
    await writeFile(path.join(inlineLinkBundle, "checksums.sha256"), await createChecksums(inlineLinkBundle), "utf8");
    await assert.rejects(validateBundle(inlineLinkBundle), /unsupported external link/u);

    const referenceLinkBundle = path.join(root, "root-readme-reference-executable-link");
    await cp(BUNDLE_ROOT, referenceLinkBundle, { recursive: true });
    await writeFile(
      path.join(referenceLinkBundle, "README.md"),
      "# Unsafe\n\n[Run][payload]\n\n[payload]: javascript:alert(1)\n",
      "utf8",
    );
    await writeFile(path.join(referenceLinkBundle, "checksums.sha256"), await createChecksums(referenceLinkBundle), "utf8");
    await assert.rejects(validateBundle(referenceLinkBundle), /unsupported external link/u);

    const encodedInlineLinkBundle = path.join(root, "root-readme-encoded-inline-executable-link");
    await cp(BUNDLE_ROOT, encodedInlineLinkBundle, { recursive: true });
    await writeFile(path.join(encodedInlineLinkBundle, "README.md"), "# Unsafe\n\n[Run](java&#115;cript:alert(1))\n", "utf8");
    await writeFile(path.join(encodedInlineLinkBundle, "checksums.sha256"), await createChecksums(encodedInlineLinkBundle), "utf8");
    await assert.rejects(validateBundle(encodedInlineLinkBundle), /unsupported external link/u);

    const encodedReferenceLinkBundle = path.join(root, "root-readme-encoded-reference-executable-link");
    await cp(BUNDLE_ROOT, encodedReferenceLinkBundle, { recursive: true });
    await writeFile(
      path.join(encodedReferenceLinkBundle, "README.md"),
      "# Unsafe\n\n[Run][payload]\n\n[payload]: java&#x73;cript:alert(1)\n",
      "utf8",
    );
    await writeFile(path.join(encodedReferenceLinkBundle, "checksums.sha256"), await createChecksums(encodedReferenceLinkBundle), "utf8");
    await assert.rejects(validateBundle(encodedReferenceLinkBundle), /unsupported external link/u);

    const encodedHtmlLinkBundle = path.join(root, "root-readme-encoded-html-executable-link");
    await cp(BUNDLE_ROOT, encodedHtmlLinkBundle, { recursive: true });
    await writeFile(
      path.join(encodedHtmlLinkBundle, "README.md"),
      "# Unsafe\n\n<a href=\"javascript&colon;alert(1)\">Run</a>\n",
      "utf8",
    );
    await writeFile(path.join(encodedHtmlLinkBundle, "checksums.sha256"), await createChecksums(encodedHtmlLinkBundle), "utf8");
    await assert.rejects(validateBundle(encodedHtmlLinkBundle), /unsupported external link/u);

    const encodedWhitespaceLinkBundle = path.join(root, "root-readme-encoded-whitespace-executable-link");
    await cp(BUNDLE_ROOT, encodedWhitespaceLinkBundle, { recursive: true });
    await writeFile(
      path.join(encodedWhitespaceLinkBundle, "README.md"),
      "# Unsafe\n\n[Run](&#32;java&#115;cript:alert(1))\n",
      "utf8",
    );
    await writeFile(path.join(encodedWhitespaceLinkBundle, "checksums.sha256"), await createChecksums(encodedWhitespaceLinkBundle), "utf8");
    await assert.rejects(validateBundle(encodedWhitespaceLinkBundle), /ASCII whitespace or a control character/u);

    const encodedPrivateHostBundle = path.join(root, "root-readme-encoded-private-host");
    await cp(BUNDLE_ROOT, encodedPrivateHostBundle, { recursive: true });
    await writeFile(
      path.join(encodedPrivateHostBundle, "README.md"),
      "# Unsafe\n\n<a href=\"https://service.intern&#97;l/private\">Private</a>\n",
      "utf8",
    );
    await writeFile(path.join(encodedPrivateHostBundle, "checksums.sha256"), await createChecksums(encodedPrivateHostBundle), "utf8");
    await assert.rejects(validateBundle(encodedPrivateHostBundle), /non-public HTTPS link/u);

    const encodedHttpBundle = path.join(root, "root-readme-encoded-http-link");
    await cp(BUNDLE_ROOT, encodedHttpBundle, { recursive: true });
    await writeFile(path.join(encodedHttpBundle, "README.md"), "# Unsafe\n\n[Public](htt&#112;://example.com)\n", "utf8");
    await writeFile(path.join(encodedHttpBundle, "checksums.sha256"), await createChecksums(encodedHttpBundle), "utf8");
    await assert.rejects(validateBundle(encodedHttpBundle), /non-public HTTPS link/u);

    const unknownEntityBundle = path.join(root, "root-readme-unknown-link-entity");
    await cp(BUNDLE_ROOT, unknownEntityBundle, { recursive: true });
    await writeFile(
      path.join(unknownEntityBundle, "README.md"),
      "# Unsafe\n\n[Private](https://service&period;internal/private)\n",
      "utf8",
    );
    await writeFile(path.join(unknownEntityBundle, "checksums.sha256"), await createChecksums(unknownEntityBundle), "utf8");
    await assert.rejects(validateBundle(unknownEntityBundle), /unsupported named character reference/u);

    const protocolRelativeBundle = path.join(root, "root-readme-protocol-relative-link");
    await cp(BUNDLE_ROOT, protocolRelativeBundle, { recursive: true });
    await writeFile(path.join(protocolRelativeBundle, "README.md"), "# Unsafe\n\n[Private](//service.internal/private)\n", "utf8");
    await writeFile(path.join(protocolRelativeBundle, "checksums.sha256"), await createChecksums(protocolRelativeBundle), "utf8");
    await assert.rejects(validateBundle(protocolRelativeBundle), /unsupported protocol-relative link/u);

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

    const protocolRelativeJsonBundle = path.join(root, "protocol-relative-json-url");
    await cp(BUNDLE_ROOT, protocolRelativeJsonBundle, { recursive: true });
    const protocolRelativeSchemaPath = path.join(protocolRelativeJsonBundle, "schemas/creator-kit-policy.v1.schema.json");
    const protocolRelativeSchema = JSON.parse(await readFile(protocolRelativeSchemaPath, "utf8"));
    protocolRelativeSchema.$comment = "//service.internal/private";
    await writeFile(protocolRelativeSchemaPath, `${JSON.stringify(protocolRelativeSchema, null, 2).replaceAll("/", "\\/")}\n`, "utf8");
    await writeFile(path.join(protocolRelativeJsonBundle, "checksums.sha256"), await createChecksums(protocolRelativeJsonBundle), "utf8");
    await assert.rejects(validateBundle(protocolRelativeJsonBundle), /unsupported URL after JSON decoding/u);

    const executableJsonBundle = path.join(root, "executable-json-url");
    await cp(BUNDLE_ROOT, executableJsonBundle, { recursive: true });
    const executableSchemaPath = path.join(executableJsonBundle, "schemas/creator-kit-policy.v1.schema.json");
    const executableSchema = JSON.parse(await readFile(executableSchemaPath, "utf8"));
    executableSchema.$comment = "javascript:alert(1)";
    const encodedExecutableSchema = JSON.stringify(executableSchema, null, 2).replace("javascript:", "java\\u0073cript:");
    await writeFile(executableSchemaPath, `${encodedExecutableSchema}\n`, "utf8");
    await writeFile(path.join(executableJsonBundle, "checksums.sha256"), await createChecksums(executableJsonBundle), "utf8");
    await assert.rejects(validateBundle(executableJsonBundle), /unsupported URL after JSON decoding/u);
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
        version: "0.1.0",
        digest: validation.checksumDigest,
        releaseUrl: "https://github.com/Spectoda/examples/releases/tag/creator-kit-v0.1.0",
        outputPath: path.join(root, "stable-channel.json"),
        confirmation: "",
      }),
      /protected human confirmation/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
