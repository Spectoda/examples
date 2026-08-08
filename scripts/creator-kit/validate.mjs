import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { bundleFiles, createChecksums, sha256 } from "./build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BUNDLE = path.join(ROOT, "creator-kit");
const SYNTHETIC_SOURCE_LOCK = "synthetic-fixture-2026-08-07";

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON ${file}: ${error.message}`);
  }
}

function findLinks(content) {
  const links = [];
  const add = (href) => {
    if (href) links.push(href.trim());
  };
  const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/gu;
  let match;
  while ((match = pattern.exec(content)) !== null) add(match[1].replace(/^<|>$/gu, ""));
  const referenceDefinition = /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>\n]+)>|(\S+))/gmu;
  while ((match = referenceDefinition.exec(content)) !== null) add(match[1] ?? match[2]);
  const autolink = /<((?:https?|mailto):[^>\s]+)>/giu;
  while ((match = autolink.exec(content)) !== null) add(match[1]);
  const htmlAnchor = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu;
  while ((match = htmlAnchor.exec(content)) !== null) add(match[1] ?? match[2] ?? match[3]);
  const htmlResource = /<[A-Za-z][^>]*\b(href|src|srcset|poster|action)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu;
  while ((match = htmlResource.exec(content)) !== null) {
    const attribute = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4];
    if (attribute === "srcset") {
      for (const candidate of value.split(",")) add(candidate.trim().split(/\s+/u)[0]);
    } else {
      add(value);
    }
  }
  const bareUrl = /https?:\/\/[^\s<>)\]}]+/giu;
  while ((match = bareUrl.exec(content)) !== null) add(match[0].replace(/[.,;:!?]+$/u, ""));
  return links;
}

function publicSafetyFinding(content) {
  const patterns = [
    ["private_key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/u],
    ["credential_assignment", /\b(?:api[_ -]?key|secret|token|password)\s*[:=]\s*["'`]?[^\s"'`]{16,}/iu],
    ["bearer_token", /\bBearer\s+[A-Za-z0-9._-]{16,}/u],
    ["github_token", /\b(?:ghp_|github_pat_|sk-)[A-Za-z0-9_-]{12,}/u],
    ["local_filesystem_path", /(?:\/Users\/|\/home\/|[A-Z]:\\\\Users\\\\)/u],
  ];
  return patterns.find(([, pattern]) => pattern.test(content))?.[0] ?? null;
}

function metadataContainsUrl(content) {
  return /(?:https?:\/\/|\/\/|(?:javascript|vbscript|data):)/iu.test(content);
}

export async function validateBundle(bundleRoot = DEFAULT_BUNDLE) {
  const root = path.resolve(bundleRoot);
  const required = [
    "README.md",
    "AGENTS.md",
    "RELEASE_NOTES.md",
    "stable-channel.json",
    "bundle.json",
    "manifest.json",
    "source-lock.json",
    "licenses.json",
    "compatibility.json",
    "selection.json",
    "indexes/documents.json",
    "indexes/terms.json",
    "checksums.sha256",
  ];
  for (const relative of required) check(await stat(path.join(root, relative)).then(() => true).catch(() => false), `Missing bundle file ${relative}`);
  const bundle = await readJson(path.join(root, "bundle.json"));
  const manifest = await readJson(path.join(root, "manifest.json"));
  const sourceLock = await readJson(path.join(root, "source-lock.json"));
  const licenses = await readJson(path.join(root, "licenses.json"));
  const compatibility = await readJson(path.join(root, "compatibility.json"));
  const selection = await readJson(path.join(root, "selection.json"));
  const stable = await readJson(path.join(root, "stable-channel.json"));
  const documentIndex = await readJson(path.join(root, "indexes/documents.json"));
  const termIndex = await readJson(path.join(root, "indexes/terms.json"));
  check(bundle.schemaVersion === "creator-kit-bundle.v1", "Wrong bundle schema");
  check(bundle.name === "Spectoda Creator Kit" && bundle.status === "candidate" && bundle.locale === "en", "Bundle identity is invalid");
  check(bundle.contentScope === "synthetic-fixture-with-public-examples", "Bundle content scope is invalid");
  check(bundle.sourceOfTruth?.documents === "synthetic-fixture" && bundle.sourceOfTruth?.examples === "Spectoda/examples", "Bundle source ownership is invalid");
  check(bundle.transport?.apiVersion === "github-release-v1", "Bundle transport is not the v1 GitHub Release contract");
  check(manifest.schemaVersion === "creator-kit-manifest.v1" && manifest.locale === "en", "Manifest schema/locale is invalid");
  check(manifest.source?.repository === "Spectoda/examples" && /^[a-f0-9]{40}$/u.test(manifest.source.commit ?? ""), "Source lock must name Examples and an exact commit");
  check(sourceLock.schemaVersion === "creator-kit-source-lock.v1" && sourceLock.repository === manifest.source.repository && sourceLock.commit === manifest.source.commit, "Source lock does not match manifest source");
  check(licenses.schemaVersion === "creator-kit-licenses.v1" && licenses.scope === "synthetic-fixture-and-public-examples", "License posture does not cover the candidate scope");
  check(licenses.realDocumentationExportAllowed === false, "Real Documentation export must remain disabled");
  check(licenses.publicationAllowed === false, "Synthetic candidate publication must remain disabled");
  check(compatibility.schemaVersion === "creator-kit-compatibility.v1" && compatibility.updatePolicy === "exact-version-partner-approved", "Compatibility policy is invalid");
  check(selection.schemaVersion === "creator-kit-selection.v1" && selection.failClosed === true, "Selection must be fail-closed");
  check(stable.schemaVersion === "creator-kit-stable-channel.v1" && stable.state === "unpublished" && stable.requiredHumanApproval === true, "Stable channel must remain unpublished behind a human gate");
  check(stable.version === null && stable.digest === null && stable.releaseUrl === null, "Unpublished stable channel must not contain release coordinates");
  check(Array.isArray(manifest.documents) && manifest.documents.length === 2, "Candidate must contain the two synthetic documents");
  check(Array.isArray(manifest.examples) && manifest.examples.length === 1, "Candidate must contain the selected public Event Player example");
  check(new Set(manifest.documents.map((document) => document.id)).size === manifest.documents.length, "Manifest document IDs must be unique");
  check(Array.isArray(documentIndex.documents) && documentIndex.documents.length === manifest.documents.length, "Document index does not match manifest");
  check(Array.isArray(termIndex.terms), "Term index is not an array");
  check(manifest.documents.map((document) => document.sourcePath).join("\n") === [...manifest.documents].sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)).map((document) => document.sourcePath).join("\n"), "Manifest documents are not sorted");
  const sourceLockByPath = new Map(sourceLock.files.map((file) => [file.sourcePath, file]));
  check(sourceLockByPath.size === sourceLock.files.length, "Source lock contains duplicate paths");
  for (const document of manifest.documents) {
    check(document.agentExport?.include === true && document.agentExport.audience === "partner-maker", `${document.sourcePath} is not explicitly selected`);
    check(document.agentExport.license === "spectoda-creator-kit-synthetic", `${document.sourcePath} has an invalid license`);
    check(document.agentExport.sourceLock === SYNTHETIC_SOURCE_LOCK, `${document.sourcePath} has an invalid synthetic fixture lock`);
    const body = await readFile(path.join(root, document.path), "utf8");
    check(!body.startsWith("---\n"), `${document.path} still contains frontmatter`);
    check(sha256(body) === document.sha256, `${document.path} content hash does not match manifest`);
    check(!publicSafetyFinding(body), `${document.path} failed public-safety scan`);
    check(!publicSafetyFinding(JSON.stringify({ title: document.title, summary: document.summary, agentExport: document.agentExport })), `${document.path} metadata failed public-safety scan`);
    check(!metadataContainsUrl(`${document.title}\n${document.summary}`), `${document.path} metadata contains a URL`);
    check(!/<[A-Za-z][^>]*\b(?:href|src|srcset|poster|action)\s*=\s*\{[^}]*\}/iu.test(body), `${document.path} contains a dynamic HTML/MDX resource link`);
    const lock = sourceLockByPath.get(document.sourcePath);
    check(lock?.bundleSha256 === document.sha256, `${document.sourcePath} source lock does not match normalized body`);
  for (const rawHref of findLinks(body)) {
    const href = rawHref.replace(/[\t\n\f\r]/gu, "");
    check(href === rawHref, `${document.path} contains a URL with control whitespace`);
      if (href.startsWith("#")) continue;
      if (/^https?:\/\//u.test(href)) {
        const url = new URL(href);
        const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "").replace(/\.$/u, "");
        check(
          url.protocol === "https:" &&
            isIP(hostname) === 0 &&
            !["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname) &&
            !hostname.endsWith(".invalid") &&
            !hostname.endsWith(".local") &&
            !hostname.endsWith(".internal") &&
            !hostname.endsWith(".lan") &&
            !hostname.endsWith(".home.arpa"),
          `${document.path} contains a non-public HTTPS link ${href}`,
        );
        continue;
      }
      if (/^[a-z][a-z0-9+.-]*:/iu.test(href)) throw new Error(`${document.path} contains an unsupported external link`);
      check(!href.startsWith("/"), `${document.path} contains an absolute local link`);
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(document.path), href.split("#")[0]));
      check(await stat(path.join(root, target)).then(() => true).catch(() => false), `${document.path} points to missing bundle link ${href}`);
    }
  }
  const example = manifest.examples[0];
  check(example.id === "player-bundle-ab-complete-cue-tracks" && example.license === "MIT", "Public example identity/license is invalid");
  check(example.compatibility?.firmware === "0.12.11" && example.compatibility?.wasm === "DEBUG_UNIVERSAL_0.12.11_20260808", "Public example compatibility is invalid");
  check(Array.isArray(example.files) && example.files.length === 3, "Public example must contain exactly the reviewed three files");
  check(
    example.files.map((file) => file.path).sort().join("\n") === [
      "examples/player-bundle-ab-complete-cue-tracks/README.md",
      "examples/player-bundle-ab-complete-cue-tracks/example.yaml",
      "examples/player-bundle-ab-complete-cue-tracks/player-bundle.be",
    ].sort().join("\n"),
    "Public example file selection is invalid",
  );
  for (const file of example.files) {
    const body = await readFile(path.join(root, file.path));
    check(sha256(body) === file.sha256 && file.sha256 === file.sourceSha256, `${file.path} is not a verbatim source copy`);
    check(!publicSafetyFinding(body.toString("utf8")), `${file.path} failed public-safety scan`);
    const lock = sourceLockByPath.get(file.sourcePath);
    check(lock?.sourceSha256 === file.sourceSha256 && lock?.bundleSha256 === file.sha256 && lock?.license === "MIT", `${file.sourcePath} source lock is invalid`);
  }
  const plugin = await readFile(path.join(root, "examples/player-bundle-ab-complete-cue-tracks/player-bundle.be"), "utf8");
  check(plugin.includes("timeline.at") && !plugin.includes("timeline.toMillis"), "Bundled Player plugin does not use the final timeline.at API");
  check(Array.isArray(selection.selectedExamples) && selection.selectedExamples.length === 1, "Selection does not expose the public example");
  const selectionLock = sourceLockByPath.get("data/v2/examples/player-bundle-ab-complete-cue-tracks/creator-kit.json");
  check(selectionLock?.role === "selection" && selectionLock.sourceSha256 === selectionLock.bundleSha256 && selectionLock.license === "MIT", "Public example selection lock is invalid");
  const expectedChecksums = (await readFile(path.join(root, "checksums.sha256"), "utf8")).trim();
  const actualChecksums = (await createChecksums(root)).trim();
  check(expectedChecksums === actualChecksums, "checksums.sha256 does not match bundle files");
  const files = await bundleFiles(root);
  const totalBytes = (await Promise.all(files.map(async (file) => (await stat(file)).size))).reduce((total, size) => total + size, 0);
  check(totalBytes <= 5242880, `Bundle is larger than 5 MiB: ${totalBytes}`);
  return {
    bundleVersion: bundle.version,
    documentCount: manifest.documents.length,
    exampleCount: manifest.examples.length,
    totalBytes,
    fileCount: files.length,
    checksumDigest: sha256(Buffer.from(`${expectedChecksums}\n`)),
    stableState: stable.state,
  };
}

async function main() {
  const result = await validateBundle(process.argv[2] ?? DEFAULT_BUNDLE);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Creator Kit Examples validation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
