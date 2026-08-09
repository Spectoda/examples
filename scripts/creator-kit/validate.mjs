import { execFileSync } from "node:child_process";
import { isIP } from "node:net";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { BUNDLE_VERSION, bundleFiles, relativePosix, sha256, verifyChecksums } from "./build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BUNDLE = path.join(ROOT, "creator-kit");
const EXAMPLE_ID = "player-show-global-sparse-cues";
const DOCUMENTATION_COMMIT = "6f6051686fe556a85318c7dd529ac061ab48c38d";
const DOCUMENTATION_CHECKSUM_DIGEST = "d4e2958303e3fd34dcb5e5c50a8a5c6a0266068ec2f15d88406a2a33bcb1f054";
const EXAMPLES_COMMIT = "e4be6dd07814c1dc8816ffc0e4ea518532e411ec";
const FIRMWARE_COMMIT = "51a8d6337d968b47f563bf2decb8f7404d93c27a";
const EXPECTED_DOCUMENTS = [
  "en/pro-vyrobce-a-tvurce/controller-config/ethernet.md",
  "en/pro-vyrobce-a-tvurce/controller-config/fw-01211-io-types.md",
  "en/pro-vyrobce-a-tvurce/controller-config/fw-01211-keywords.md",
  "en/pro-vyrobce-a-tvurce/controller-config/index.md",
  "en/pro-vyrobce-a-tvurce/controller-config/io-type-dali.md",
  "en/pro-vyrobce-a-tvurce/controller-config/wasm-schema.md",
  "en/pro-vyrobce-a-tvurce/spectoda-creator-kit.md",
];
const EXPECTED_DOCUMENT_HASHES = new Map([
  ["en/pro-vyrobce-a-tvurce/controller-config/ethernet.md", { normalized: "d6441fd0b663b8f77cf9c6acee73dd4d475cbcb1abf1f56118f67ff5294b1e1b", source: "1ada69f668140b497925ca13f7000f94800a967b896d6bcf17e69033a2bb4152" }],
  ["en/pro-vyrobce-a-tvurce/controller-config/fw-01211-io-types.md", { normalized: "c392c1c2289eeaad6b0f3e0c77ea821ea455ee9c688b893adb8204e4523c61a0", source: "5caf1cd413f1fc0f6809f593f29ffb0ecd14839f60e26cadf113480e03f1f826" }],
  ["en/pro-vyrobce-a-tvurce/controller-config/fw-01211-keywords.md", { normalized: "acc885a529f405ac2047fadbb0de9b431f5ab841677f3b47f83db5c354d4ba0e", source: "23be2a096a1aedbb233cddb0700e21a1fcfe3d6746124c705fd05abb30cfb47f" }],
  ["en/pro-vyrobce-a-tvurce/controller-config/index.md", { normalized: "3655bdaac1de00eed7d21b28a00a452aa7163abfe620c477ff021dfdd738d48c", source: "1e51564d970ed526a1c01dfa2e9445d46090cf13e99e8ae409ca47d7efcc01d4" }],
  ["en/pro-vyrobce-a-tvurce/controller-config/io-type-dali.md", { normalized: "e29e767380b857be6295bef82fc4878f005a025b3ec9d537de427e1b06c98ec3", source: "fe41a923e09eb0b5a7466b6a8b2226d3bdcad1357286ffc6188491905e2eddec" }],
  ["en/pro-vyrobce-a-tvurce/controller-config/wasm-schema.md", { normalized: "7b97193f4ce1f58c46e2e1eb6e5d9eb929747e2326844c8e19b9a8d5c79390b3", source: "de03ed774fa7ac3f0c820593f10f489435f2293a10fbc02b092cfe825f997668" }],
  ["en/pro-vyrobce-a-tvurce/spectoda-creator-kit.md", { normalized: "9f14dd2893688637f440a16432f947609d68267549288f6c96be354ce4c7a7fd", source: "834752ec0bc4fc8f739c00cbbd56f82a790ea8ecabacf890d5358841f78e7809" }],
]);
const EXPECTED_ASSETS = [
  {
    role: "controller-config-contract",
    path: "assets/docs/controller-config/0.12.11/controller-config.contract.json",
    sha256: "760cbcde5038f98bae60aea96f6f36f2b4b01aae04c33571b26cfbe2fcd1b38f",
  },
  {
    role: "controller-config-schema",
    path: "assets/docs/controller-config/0.12.11/controller-config.schema.json",
    sha256: "d9ee689ad41bb0b845070d77dfe6eb061976f9e077c293a730e5f520ea8f037c",
  },
];
const EXPECTED_EXAMPLE_FILES = [
  `examples/${EXAMPLE_ID}/README.md`,
  `examples/${EXAMPLE_ID}/example.yaml`,
  `examples/${EXAMPLE_ID}/player.be`,
];
const EXPECTED_SCHEMAS = [
  "creator-kit-bundle.v1.schema.json",
  "creator-kit-compatibility.v1.schema.json",
  "creator-kit-document-index.v1.schema.json",
  "creator-kit-licenses.v1.schema.json",
  "creator-kit-manifest.v1.schema.json",
  "creator-kit-policy.v1.schema.json",
  "creator-kit-selection.v1.schema.json",
  "creator-kit-source-lock.v1.schema.json",
  "creator-kit-stable-channel.v1.schema.json",
  "creator-kit-term-index.v1.schema.json",
];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function exists(file) {
  return stat(file).then((value) => value.isFile()).catch(() => false);
}

function isSafeRelative(value) {
  return typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !/(?:^|\/)\.\.?(?:\/|$)/u.test(value) &&
    path.posix.normalize(value) === value;
}

function publicSafetyFinding(content) {
  const patterns = [
    ["private_key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/u],
    ["credential_assignment", /\b(?:api[_ -]?key|secret|token|password)\s*[:=]\s*["'`]?[A-Za-z0-9_./+=-]{16,}/iu],
    ["bearer_token", /\bBearer\s+[A-Za-z0-9._-]{16,}/u],
    ["github_token", /\b(?:ghp_|github_pat_|sk-)[A-Za-z0-9_-]{12,}/u],
    ["local_filesystem_path", /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)/u],
  ];
  return patterns.find(([, pattern]) => pattern.test(content))?.[0] ?? null;
}

function metadataSafetyFinding(value) {
  const content = JSON.stringify(value);
  return publicSafetyFinding(content) ?? (/(?:https?:\/\/|\/\/|(?:javascript|vbscript|data):)/iu.test(content) ? "unsafe_link" : null);
}

function privateUrlFinding(content) {
  const matches = content.match(/https?:\/\/[^\s"'<>)}\]]+/giu) ?? [];
  for (const raw of matches) {
    let url;
    try {
      url = new URL(raw.replace(/[.,;:!?]+$/u, ""));
    } catch {
      return raw;
    }
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "").replace(/\.$/u, "");
    const approvedLegacySchemaUrl = url.protocol === "http:" && hostname === "json-schema.org";
    if (
      (!approvedLegacySchemaUrl && url.protocol !== "https:") ||
      url.username !== "" ||
      url.password !== "" ||
      isIP(hostname) !== 0 ||
      ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname) ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".invalid") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan") ||
      hostname.endsWith(".home.arpa")
    ) return raw;
  }
  return null;
}

function outsideCodeContent(content) {
  const visible = [];
  let fence = null;
  for (const line of content.replace(/\r\n?/gu, "\n").split("\n")) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
    if (!fence && marker && (marker[1][0] !== "`" || !marker[2].includes("`"))) {
      fence = { character: marker[1][0], length: marker[1].length };
      visible.push("");
      continue;
    }
    if (fence && marker && marker[1][0] === fence.character && marker[1].length >= fence.length && /^[ \t]*$/u.test(marker[2])) {
      fence = null;
      visible.push("");
      continue;
    }
    visible.push(fence ? "" : line.replace(/(`+)(?:[^`]|`(?!\1))*\1/gu, ""));
  }
  return visible.join("\n");
}

function executableContentFinding(content, sourcePath) {
  const visible = outsideCodeContent(content);
  if (/<\s*\/?\s*(?:script|iframe|object|embed|applet|base|meta|link|style)\b/iu.test(visible)) return "executable_html";
  if (/<[A-Za-z][^>]*\bon[a-z][A-Za-z0-9:_-]*\s*=/iu.test(visible)) return "html_event_handler";
  if (/<[A-Za-z][^>]*\b(?:srcdoc|formaction)\s*=/iu.test(visible)) return "executable_html_attribute";
  if (visible.includes("<") && /\b(?:javascript|vbscript|data):/iu.test(visible)) return "executable_html_scheme";
  if (/(?:^|\n)[ \t]*(?:import|export)\s+/u.test(visible)) return "executable_mdx";
  if (sourcePath.endsWith(".mdx") && (/[{}]/u.test(visible) || /<[A-Z][A-Za-z0-9_.:-]*(?:\s|\/?>)/u.test(visible))) return "executable_mdx";
  return null;
}

function findLinks(content) {
  content = outsideCodeContent(content);
  const links = [];
  const add = (value) => { if (value) links.push(value.trim().replace(/^<|>$/gu, "")); };
  let match;
  const markdown = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/gu;
  while ((match = markdown.exec(content)) !== null) add(match[1]);
  const references = /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>\n]+)>|(\S+))/gmu;
  while ((match = references.exec(content)) !== null) add(match[1] ?? match[2]);
  const html = /<[A-Za-z][^>]*\b(?:href|src|poster|action)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu;
  while ((match = html.exec(content)) !== null) add(match[1] ?? match[2] ?? match[3]);
  const autolink = /<(https?:\/\/[^>\s]+)>/giu;
  while ((match = autolink.exec(content)) !== null) add(match[1]);
  const bareUrl = /https?:\/\/[^\s<>)\]}]+/giu;
  while ((match = bareUrl.exec(content)) !== null) add(match[0].replace(/[.,;:!?]+$/u, ""));
  return links;
}

function sourceCandidates(target) {
  const pageTarget = target.replace(/\/+$/u, "");
  return [pageTarget, path.posix.join(pageTarget, "index.md"), path.posix.join(pageTarget, "index.mdx"), `${pageTarget}.md`, `${pageTarget}.mdx`];
}

async function assertDocumentLinks(root, document, selectedDocumentPaths, selectedAssetPaths) {
  const body = await readFile(path.join(root, document.path), "utf8");
  for (const rawHref of findLinks(body)) {
    const href = rawHref.replace(/[\t\n\f\r]/gu, "");
    check(href === rawHref, `${document.path} contains control whitespace in a link`);
    if (href.startsWith("#")) continue;
    if (/^https?:\/\//iu.test(href)) {
      const url = new URL(href);
      const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "").replace(/\.$/u, "");
      check(
        url.protocol === "https:" &&
          url.username === "" &&
          url.password === "" &&
          isIP(hostname) === 0 &&
          !["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname) &&
          !hostname.endsWith(".localhost") &&
          !hostname.endsWith(".invalid") &&
          !hostname.endsWith(".local") &&
          !hostname.endsWith(".internal") &&
          !hostname.endsWith(".lan") &&
          !hostname.endsWith(".home.arpa"),
        `${document.path} contains a non-public HTTPS link ${href}`,
      );
      continue;
    }
    check(!/^[a-z][a-z0-9+.-]*:/iu.test(href), `${document.path} contains an unsupported external link ${href}`);
    const pathOnly = href.split("#", 1)[0];
    if (pathOnly.startsWith("/assets/")) {
      const assetPath = pathOnly.slice(1);
      check(selectedAssetPaths.has(assetPath), `${document.path} points to an unselected asset ${href}`);
      check(await exists(path.join(root, assetPath)), `${document.path} points to a missing asset ${href}`);
      continue;
    }
    if (pathOnly.startsWith("/en/")) {
      const routeTarget = `en/${pathOnly.slice(4)}`;
      const selected = sourceCandidates(routeTarget).find((candidate) => selectedDocumentPaths.has(candidate));
      check(selected, `${document.path} points to an unselected document ${href}`);
      check(await exists(path.join(root, "documents", selected)), `${document.path} points to a missing document ${href}`);
      continue;
    }
    check(!pathOnly.startsWith("/"), `${document.path} contains an unsupported absolute local link ${href}`);
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(document.sourcePath), pathOnly));
    const selected = sourceCandidates(target).find((candidate) => selectedDocumentPaths.has(candidate));
    check(selected, `${document.path} points to an unselected relative document ${href}`);
    check(await exists(path.join(root, "documents", selected)), `${document.path} points to a missing relative document ${href}`);
  }
}

function gitBytes(commit, repositoryPath) {
  try {
    return execFileSync("git", ["show", `${commit}:${repositoryPath}`], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
  } catch {
    throw new Error(`${repositoryPath} is unavailable at locked Examples commit ${commit}`);
  }
}

export async function validateBundle(bundleRoot = DEFAULT_BUNDLE) {
  const root = path.resolve(bundleRoot);
  const required = [
    "README.md", "AGENTS.md", "RELEASE_NOTES.md", "bundle.json", "manifest.json", "source-lock.json",
    "licenses.json", "compatibility.json", "selection.json", "stable-channel.json", "checksums.sha256",
    "indexes/documents.json", "indexes/terms.json", "LICENSES/CC-BY-4.0.md", "LICENSES/MIT.txt",
  ];
  for (const relative of required) check(await exists(path.join(root, relative)), `Missing bundle file ${relative}`);

  const bundle = await readJson(path.join(root, "bundle.json"));
  const manifest = await readJson(path.join(root, "manifest.json"));
  const sourceLock = await readJson(path.join(root, "source-lock.json"));
  const licenses = await readJson(path.join(root, "licenses.json"));
  const compatibility = await readJson(path.join(root, "compatibility.json"));
  const selection = await readJson(path.join(root, "selection.json"));
  const stable = await readJson(path.join(root, "stable-channel.json"));
  const documentIndex = await readJson(path.join(root, "indexes/documents.json"));
  const termIndex = await readJson(path.join(root, "indexes/terms.json"));

  check(bundle.schemaVersion === "creator-kit-bundle.v1" && bundle.name === "Spectoda Creator Kit", "Bundle identity is invalid");
  check(bundle.version === BUNDLE_VERSION && bundle.status === "candidate" && bundle.locale === "en", "Bundle version/status/locale is invalid");
  check(bundle.contentScope === "licensed-documentation-with-public-examples", "Bundle content scope is invalid");
  check(bundle.sourceOfTruth === "Spectoda/documentation", "Documentation must remain the bundle source of truth");
  check(bundle.transport?.apiVersion === "github-release-v1", "Bundle transport is invalid");
  check(manifest.bundleVersion === BUNDLE_VERSION && manifest.contentScope === bundle.contentScope, "Manifest does not match the bundle");
  check(manifest.source?.repository === "Spectoda/documentation" && manifest.source.commit === DOCUMENTATION_COMMIT, "Documentation source lock is invalid");
  check(sourceLock.repository === "Spectoda/documentation" && sourceLock.commit === DOCUMENTATION_COMMIT, "Source lock does not match Documentation");
  check(sourceLock.documentationBundle?.commit === DOCUMENTATION_COMMIT, "Documentation snapshot commit is invalid");
  check(sourceLock.documentationBundle?.checksumDigest === DOCUMENTATION_CHECKSUM_DIGEST, "Documentation snapshot digest is invalid");
  check(licenses.publicationAllowed === true && licenses.realDocumentationExportAllowed === true, "Publication license gate is not open");
  check(licenses.scope === "licensed-documentation-with-public-examples", "License scope is invalid");
  check(JSON.stringify(licenses.entries) === JSON.stringify(["CC-BY-4.0", "MIT"]), "License entries must be CC BY 4.0 and MIT only");
  check(!JSON.stringify({ manifest, sourceLock, licenses, selection }).includes("spectoda-creator-kit-synthetic"), "Synthetic-only metadata remains in the public snapshot");
  check(compatibility.updatePolicy === "exact-version-partner-approved" && compatibility.transport === "github-release-v1", "Compatibility contract is invalid");
  check(stable.state === "unpublished" && stable.version === null && stable.digest === null && stable.releaseUrl === null, "Stable channel must remain unpublished");
  check(stable.requiredHumanApproval === true, "Stable channel approval gate is missing");

  const documentPaths = manifest.documents.map((document) => document.sourcePath);
  check(JSON.stringify(documentPaths) === JSON.stringify(EXPECTED_DOCUMENTS), "Document selection is not the reviewed seven-page set");
  check(new Set(manifest.documents.map((document) => document.id)).size === manifest.documents.length, "Document IDs are not unique");
  check(documentIndex.documents?.length === manifest.documents.length && Array.isArray(termIndex.terms), "Search indexes do not match the documents");
  const documentIndexById = new Map(documentIndex.documents.map((document) => [document.id, document]));
  check(documentIndexById.size === documentIndex.documents.length, "Document index IDs are not unique");
  const selectedDocumentPaths = new Set(documentPaths);
  const sourceFiles = new Map(sourceLock.files.map((file) => [file.sourcePath, file]));
  for (const document of manifest.documents) {
    check(isSafeRelative(document.path) && document.path === `documents/${document.sourcePath}`, `${document.sourcePath} has an unsafe bundle path`);
    check(document.agentExport?.license === "CC-BY-4.0" && document.agentExport.publicDerivative === true, `${document.sourcePath} has an invalid license`);
    check(!metadataSafetyFinding({ title: document.title, summary: document.summary, agentExport: document.agentExport }), `${document.sourcePath} metadata failed public-safety validation`);
    const indexed = documentIndexById.get(document.id);
    check(
      indexed?.path === document.path && indexed.title === document.title && indexed.summary === document.summary && indexed.sha256 === document.sha256,
      `${document.sourcePath} document index entry does not match the manifest`,
    );
    check(!metadataSafetyFinding(indexed), `${document.sourcePath} document index metadata failed public-safety validation`);
    const body = await readFile(path.join(root, document.path));
    const bodyText = body.toString("utf8");
    check(!publicSafetyFinding(bodyText), `${document.path} failed public-safety validation`);
    check(!executableContentFinding(bodyText, document.sourcePath), `${document.path} contains executable Markdown/MDX content`);
  }

  check(manifest.assets?.length === 2, "Creator Kit must include exactly two Controller Config assets");
  const selectedAssetPaths = new Set();
  const assetLocks = new Map(sourceLock.assets.map((asset) => [asset.role, asset]));
  for (const expected of EXPECTED_ASSETS) {
    const asset = manifest.assets.find((entry) => entry.role === expected.role);
    check(asset?.path === expected.path && asset.sha256 === expected.sha256 && asset.sourceSha256 === expected.sha256, `${expected.role} manifest entry is invalid`);
    check(asset.license === "CC-BY-4.0" && asset.publicDerivative === true && asset.firmwareVersion === "0.12.11", `${expected.role} license/firmware metadata is invalid`);
    check(asset.upstreamSource?.repository === "Spectoda/firmware" && asset.upstreamSource.commit === FIRMWARE_COMMIT, `${expected.role} firmware provenance is invalid`);
    const bytes = await readFile(path.join(root, asset.path));
    check(sha256(bytes) === expected.sha256, `${expected.role} bundled bytes are invalid`);
    const lock = assetLocks.get(expected.role);
    check(lock?.bundlePath === asset.path && lock.bundleSha256 === expected.sha256 && lock.upstreamCommit === FIRMWARE_COMMIT, `${expected.role} source lock is invalid`);
    selectedAssetPaths.add(asset.path);
  }
  for (const document of manifest.documents) await assertDocumentLinks(root, document, selectedDocumentPaths, selectedAssetPaths);
  for (const document of manifest.documents) {
    const expectedHashes = EXPECTED_DOCUMENT_HASHES.get(document.sourcePath);
    const body = await readFile(path.join(root, document.path));
    check(expectedHashes && sha256(body) === expectedHashes.normalized, `${document.path} does not match the reviewed Documentation hash`);
    check(document.sha256 === expectedHashes.normalized && document.sourceSha256 === expectedHashes.source, `${document.sourcePath} manifest hashes are not the reviewed values`);
    const lock = sourceFiles.get(document.sourcePath);
    check(lock?.normalizedSha256 === expectedHashes.normalized && lock?.sourceSha256 === expectedHashes.source && lock?.license === "CC-BY-4.0", `${document.sourcePath} source lock is invalid`);
  }

  check(manifest.examples?.length === 1, "Creator Kit must contain exactly one reviewed public example");
  const example = manifest.examples[0];
  check(example.id === EXAMPLE_ID && example.license === "MIT", "Event Player example identity/license is invalid");
  check(example.source?.repository === "Spectoda/examples" && example.source.commit === EXAMPLES_COMMIT, "Event Player source commit is invalid");
  check(example.compatibility?.firmware === "0.12.11", "Event Player firmware compatibility is invalid");
  check(JSON.stringify(example.files.map((file) => file.path).sort()) === JSON.stringify([...EXPECTED_EXAMPLE_FILES].sort()), "Event Player file selection is invalid");
  const exampleLocks = new Map(sourceLock.examples.map((entry) => [entry.sourcePath, entry]));
  for (const file of example.files) {
    check(isSafeRelative(file.path), `${file.path} is unsafe`);
    const bytes = await readFile(path.join(root, file.path));
    const lockedBytes = gitBytes(EXAMPLES_COMMIT, file.sourcePath);
    check(bytes.equals(lockedBytes), `${file.path} is not a verbatim copy from the locked Examples commit`);
    check(sha256(bytes) === file.sha256 && file.sha256 === file.sourceSha256, `${file.path} hash is invalid`);
    check(!publicSafetyFinding(bytes.toString("utf8")), `${file.path} failed public-safety validation`);
    const lock = exampleLocks.get(file.sourcePath);
    check(lock?.role === "file" && lock.bundlePath === file.path && lock.bundleSha256 === file.sha256 && lock.license === "MIT", `${file.sourcePath} source lock is invalid`);
  }
  const selectionPath = `data/v2/examples/${EXAMPLE_ID}/creator-kit.json`;
  const selectionLock = exampleLocks.get(selectionPath);
  check(selectionLock?.role === "selection" && selectionLock.bundlePath === null && selectionLock.license === "MIT", "Event Player selection lock is invalid");
  check(selectionLock.sourceSha256 === sha256(gitBytes(EXAMPLES_COMMIT, selectionPath)), "Event Player selection hash is invalid");
  check(selection.selectedExamples?.[0]?.source?.commit === EXAMPLES_COMMIT, "Event Player selection provenance is invalid");

  const plugin = await readFile(path.join(root, `examples/${EXAMPLE_ID}/player.be`), "utf8");
  check(plugin.includes("timeline.at") && !plugin.includes("timeline.toMillis"), "Event Player plugin does not use the reviewed timeline.at API");
  check(plugin.includes('"source":"networkStorage"') && !plugin.includes('find("ids"'), "Event Player plugin must land the global stream without local ID selection");
  check((await readFile(path.join(root, "LICENSES/MIT.txt"))).equals(await readFile(path.join(ROOT, "LICENSE"))), "Bundled MIT license differs from the repository license");
  const ccLicense = await readFile(path.join(root, "LICENSES/CC-BY-4.0.md"), "utf8");
  check(ccLicense.includes("https://creativecommons.org/licenses/by/4.0/") && /trademarks are\s+not licensed/iu.test(ccLicense), "CC BY 4.0 attribution/trademark notice is incomplete");
  check(/public prerelease/iu.test(await readFile(path.join(root, "RELEASE_NOTES.md"), "utf8")), "Release notes do not describe the public prerelease");

  const files = await bundleFiles(root);
  const actualFiles = [...files.map((file) => relativePosix(root, file)), "checksums.sha256"].sort();
  const expectedFiles = [
    ...required,
    ...manifest.documents.map((document) => document.path),
    ...manifest.assets.map((asset) => asset.path),
    ...example.files.map((file) => file.path),
    ...EXPECTED_SCHEMAS.map((schema) => `schemas/${schema}`),
  ];
  check(
    new Set(expectedFiles).size === expectedFiles.length && JSON.stringify(actualFiles) === JSON.stringify(expectedFiles.sort()),
    "Creator Kit contains an unmanifested or missing file",
  );
  for (const relative of actualFiles) {
    const content = await readFile(path.join(root, relative), "utf8");
    check(!publicSafetyFinding(content), `${relative} failed whole-bundle public-safety validation`);
    check(!privateUrlFinding(content), `${relative} contains a private or unsupported URL`);
  }
  const checksums = await verifyChecksums(root);
  const totalBytes = (await Promise.all(files.map(async (file) => (await stat(file)).size))).reduce((sum, size) => sum + size, 0);
  check(totalBytes <= 8 * 1024 * 1024, `Creator Kit is larger than 8 MiB: ${totalBytes}`);
  const schemas = (await readdir(path.join(root, "schemas"))).filter((name) => name.endsWith(".json")).sort();
  check(JSON.stringify(schemas) === JSON.stringify(EXPECTED_SCHEMAS), "Creator Kit schema selection is invalid");
  for (const schema of schemas) await readJson(path.join(root, "schemas", schema));
  return {
    bundleVersion: bundle.version,
    documentCount: manifest.documents.length,
    assetCount: manifest.assets.length,
    exampleCount: manifest.examples.length,
    totalBytes,
    fileCount: files.length,
    checksumCount: checksums.count,
    checksumDigest: checksums.digest,
    stableState: stable.state,
  };
}

async function main() {
  console.log(JSON.stringify(await validateBundle(process.argv[2] ?? DEFAULT_BUNDLE), null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Creator Kit validation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
