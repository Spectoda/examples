import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rename, rm, stat, writeFile, mkdir, copyFile } from "node:fs/promises";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EXPORTER_VERSION = "examples-creator-kit-builder/1.0.0";
export const BUNDLE_NAME = "Spectoda Creator Kit";
const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE_ROOT = path.join(SCRIPT_ROOT, "creator-kit-templates");
const DEFAULT_SOURCE = path.join(SCRIPT_ROOT, "creator-kit-fixtures");
const NEGATIVE_SOURCE = path.join(SCRIPT_ROOT, "creator-kit-negative-fixtures");
const DEFAULT_OUTPUT = path.join(SCRIPT_ROOT, "creator-kit");
const SYNTHETIC_SOURCE_LOCK = "synthetic-fixture-2026-08-07";
const PUBLIC_EXAMPLE_ROOT = path.join(SCRIPT_ROOT, "data/v2/examples/player-show-complete-cue-tracks");
const PUBLIC_EXAMPLE_SELECTION = path.join(PUBLIC_EXAMPLE_ROOT, "creator-kit.json");
const PUBLIC_EXAMPLE_DESTINATION = "examples/player-show-complete-cue-tracks";
const EXAMPLES_REPOSITORY = "Spectoda/examples";

export class CreatorKitBuildError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CreatorKitBuildError";
    this.code = code;
  }
}

const fail = (code, message) => {
  throw new CreatorKitBuildError(code, message);
};

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isStrictDescendant(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertSafeOutputDir(output, source) {
  const allowed = output === DEFAULT_OUTPUT || isStrictDescendant(DEFAULT_OUTPUT, output) || isStrictDescendant(tmpdir(), output);
  if (!allowed || isWithin(output, SCRIPT_ROOT) || isWithin(output, source) || isWithin(source, output)) {
    fail("unsafe_output", "Output must be the Creator Kit distribution directory, a child build directory, or an OS temporary directory");
  }
}
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const relativePosix = (root, absolute) => path.relative(root, absolute).split(path.sep).join("/");

function parseScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\([\\"'])/g, "$1");
  }
  return trimmed;
}

export function parseFrontmatter(raw) {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.startsWith("---\n")) fail("frontmatter_required", "Every exported fixture requires frontmatter");
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) fail("invalid_frontmatter", "Frontmatter has no closing delimiter");
  const data = {};
  let section = null;
  for (const line of normalized.slice(4, end).split("\n")) {
    if (!line.trim()) continue;
    const root = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/u);
    if (root) {
      const [, key, value] = root;
      data[key] = value ? parseScalar(value) : {};
      section = value ? null : key;
      continue;
    }
    const nested = line.match(/^\s{2,}([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/u);
    if (!nested || !section || typeof data[section] !== "object" || Array.isArray(data[section])) {
      fail("invalid_frontmatter", `Unsupported frontmatter line: ${line}`);
    }
    data[section][nested[1]] = parseScalar(nested[2]);
  }
  return { data, content: normalized.slice(end + 4) };
}

export function normalizeMarkdown(content, sourcePath) {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .normalize("NFC")
    .split("\n");
  const result = [];
  const outsideFence = [];
  let fence = null;
  for (const original of lines) {
    const line = original.replace(/[ \t]+$/u, "");
    const trimmed = line.trim();
    const markerMatch = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
    const marker = markerMatch ? { character: markerMatch[1][0], length: markerMatch[1].length, remainder: markerMatch[2] } : null;
    if (!fence && marker && (marker.character !== "`" || !marker.remainder.includes("`"))) {
      fence = { character: marker.character, length: marker.length };
    } else if (fence && marker && /^[ \t]*$/u.test(marker.remainder) && fence.character === marker.character && marker.length >= fence.length) {
      fence = null;
    } else if (!fence) {
      outsideFence.push(trimmed);
      if (
        /<\s*\/?\s*(?:script|iframe|object|embed|applet|base|meta|link|style)\b/iu.test(trimmed) ||
        /<[A-Za-z][^>]*\bon[a-z][A-Za-z0-9:_-]*\s*=/iu.test(trimmed) ||
        /<[A-Za-z][^>]*\b(?:srcdoc|formaction)\s*=/iu.test(trimmed) ||
        (trimmed.includes("<") && /\b(?:javascript|vbscript|data):/iu.test(trimmed))
      ) fail("executable_html", `${sourcePath} contains executable or unsafe raw HTML`);
      if (/^(?:import|export)\s+/u.test(trimmed)) fail("executable_mdx", `${sourcePath} contains an executable MDX statement`);
      if (sourcePath.endsWith(".mdx") && (/\{[^}\n]*\}/u.test(trimmed) || /<[A-Z][A-Za-z0-9_.:-]*(?:\s|\/?>)/u.test(trimmed))) fail("executable_mdx", `${sourcePath} contains an MDX expression or JSX component`);
    }
    if (line === "" && result.at(-1) === "") continue;
    result.push(line);
  }
  const outsideContent = outsideFence.join("\n");
  if (
    /<\s*\/?\s*(?:script|iframe|object|embed|applet|base|meta|link|style)\b/iu.test(outsideContent) ||
    /<[A-Za-z][^>]*\bon[a-z][A-Za-z0-9:_-]*\s*=/iu.test(outsideContent) ||
    /<[A-Za-z][^>]*\b(?:srcdoc|formaction)\s*=/iu.test(outsideContent) ||
    (outsideContent.includes("<") && /\b(?:javascript|vbscript|data):/iu.test(outsideContent))
  ) fail("executable_html", `${sourcePath} contains executable or unsafe raw HTML`);
  if (sourcePath.endsWith(".mdx") && (/[{}]/u.test(outsideContent) || /<[A-Z][A-Za-z0-9_.:-]*(?:\s|\/?>)/u.test(outsideContent))) {
    fail("executable_mdx", `${sourcePath} contains an MDX expression or JSX component`);
  }
  const normalized = `${result.join("\n").trim()}\n`;
  if (normalized === "\n") fail("empty_document", `${sourcePath} is empty`);
  return normalized;
}

function credentialFinding(content) {
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

function links(content) {
  const result = [];
  const add = (href) => {
    if (href) result.push(href.trim());
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
  return result;
}

function assertLinks(content, sourcePath, sourcePaths) {
  if (/<[A-Za-z][^>]*\b(?:href|src|srcset|poster|action)\s*=\s*\{[^}]*\}/iu.test(content)) {
    fail("unsafe_link", `${sourcePath} contains a dynamic HTML/MDX resource link`);
  }
  for (const rawHref of links(content)) {
    const href = rawHref.replace(/[\t\n\f\r]/gu, "");
    if (href !== rawHref) fail("unsafe_link", `${sourcePath} contains a URL with control whitespace`);
    if (href.startsWith("#")) continue;
    if (/^[a-z][a-z0-9+.-]*:/iu.test(href) && !/^https?:\/\//iu.test(href)) {
      fail("unsafe_link", `${sourcePath} contains an unsupported external link: ${href}`);
    }
    if (/^https?:\/\//iu.test(href)) {
      const url = new URL(href);
      const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "").replace(/\.$/u, "");
      if (
        url.protocol !== "https:" ||
        isIP(hostname) !== 0 ||
        ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname) ||
        hostname.endsWith(".invalid") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal") ||
        hostname.endsWith(".lan") ||
        hostname.endsWith(".home.arpa")
      ) {
        fail("unsafe_link", `${sourcePath} contains ${href}`);
      }
      continue;
    }
    if (href.startsWith("/")) fail("unsafe_link", `${sourcePath} contains an absolute local link`);
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), href.split("#")[0]));
    const candidates = [target, path.posix.join(target, "index.md"), `${target}.md`, `${target}.mdx`];
    if (!candidates.some((candidate) => sourcePaths.has(candidate))) fail("broken_link", `${sourcePath} points to ${href}`);
  }
}

async function walk(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  await visit(root);
  return files;
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, json(value), "utf8");
}

export async function bundleFiles(root) {
  return (await walk(root)).filter((file) => relativePosix(root, file) !== "checksums.sha256");
}

export async function createChecksums(root) {
  const lines = [];
  for (const file of await bundleFiles(root)) {
    lines.push(`${sha256(await readFile(file))}  ${relativePosix(root, file)}`);
  }
  return `${lines.sort().join("\n")}\n`;
}

function terms(documents) {
  const index = new Map();
  for (const document of documents) {
    const documentTerms = new Set(document.content.toLowerCase().match(/[a-z][a-z0-9-]{2,}/gu) ?? []);
    for (const term of documentTerms) index.set(term, [...(index.get(term) ?? []), document.id]);
  }
  return [...index.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([term, ids]) => ({ term, documentIds: ids.sort() }));
}

async function copyTemplates(output) {
  for (const file of await walk(TEMPLATE_ROOT)) {
    const relative = relativePosix(TEMPLATE_ROOT, file);
    const destination = path.join(output, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(file, destination);
  }
}

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: SCRIPT_ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function verifySourceAtCommit(file, sourcePath, sourceCommit, raw) {
  if (!/^[a-f0-9]{40}$/u.test(sourceCommit)) fail("source_commit_required", `${sourcePath} requires a 40-character source commit`);
  const repositoryPath = relativePosix(SCRIPT_ROOT, file);
  if (repositoryPath.startsWith("../") || path.isAbsolute(repositoryPath)) fail("source_path_outside_repository", `${sourcePath} is outside the Examples repository`);
  let locked;
  try {
    locked = execFileSync("git", ["show", `${sourceCommit}:${repositoryPath}`], { cwd: SCRIPT_ROOT, maxBuffer: 16 * 1024 * 1024 });
  } catch {
    fail("source_lock_unavailable", `${sourcePath} is not available at source commit ${sourceCommit}`);
  }
  if (sha256(locked) !== sha256(raw)) fail("source_lock_mismatch", `${sourcePath} bytes differ from source commit ${sourceCommit}`);
}

function assertExactKeys(value, expected, sourcePath) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_example_selection", `${sourcePath} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join("\n") !== wanted.join("\n")) fail("invalid_example_selection", `${sourcePath} has unsupported or missing fields`);
}

async function loadPublicExamples(sourceCommit) {
  const selectionRaw = await readFile(PUBLIC_EXAMPLE_SELECTION);
  verifySourceAtCommit(PUBLIC_EXAMPLE_SELECTION, relativePosix(SCRIPT_ROOT, PUBLIC_EXAMPLE_SELECTION), sourceCommit, selectionRaw);
  let selection;
  try {
    selection = JSON.parse(selectionRaw.toString("utf8"));
  } catch {
    fail("invalid_example_selection", "The public example selection is not valid JSON");
  }
  assertExactKeys(selection, ["schemaVersion", "include", "audience", "license", "topic", "stability", "compatibility", "files"], "creator-kit.json");
  assertExactKeys(selection.compatibility ?? {}, ["firmware", "wasm"], "creator-kit.json compatibility");
  if (
    selection.schemaVersion !== "creator-kit-example.v1" ||
    selection.include !== true ||
    selection.audience !== "partner-maker" ||
    selection.license !== "MIT" ||
    selection.topic !== "studio-event-player" ||
    selection.stability !== "firmware-0.12.11" ||
    selection.compatibility.firmware !== "0.12.11" ||
    selection.compatibility.wasm !== "DEBUG_UNIVERSAL_0.12.11_20260808" ||
    !Array.isArray(selection.files) ||
    selection.files.length === 0
  ) {
    fail("invalid_example_selection", "The public Event Player example has not explicitly opted into the reviewed Creator Kit contract");
  }
  const uniqueFiles = new Set(selection.files);
  if (uniqueFiles.size !== selection.files.length) fail("invalid_example_selection", "The public example selection contains duplicate files");
  const files = [];
  for (const relative of selection.files) {
    if (
      typeof relative !== "string" ||
      relative !== path.posix.basename(relative) ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:md|yaml|be)$/u.test(relative)
    ) {
      fail("invalid_example_selection", `The public example selection contains an unsafe path: ${String(relative)}`);
    }
    const source = path.join(PUBLIC_EXAMPLE_ROOT, relative);
    if (!isStrictDescendant(PUBLIC_EXAMPLE_ROOT, source)) fail("invalid_example_selection", `${relative} escapes the public example directory`);
    const raw = await readFile(source);
    const sourcePath = relativePosix(SCRIPT_ROOT, source);
    verifySourceAtCommit(source, sourcePath, sourceCommit, raw);
    const finding = credentialFinding(raw.toString("utf8"));
    if (finding) fail("public_safety", `${sourcePath} matched ${finding}`);
    files.push({
      source,
      sourcePath,
      path: `${PUBLIC_EXAMPLE_DESTINATION}/${relative}`,
      format: path.extname(relative).slice(1),
      sourceSha256: sha256(raw),
      sha256: sha256(raw),
      bytes: raw,
    });
  }
  files.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  const readme = files.find((file) => file.sourcePath.endsWith("/README.md"));
  const title = readme?.bytes.toString("utf8").match(/^#\s+(.+)$/mu)?.[1]?.trim();
  if (!title) fail("invalid_example_selection", "The public Event Player example README needs a title");
  return {
    selection: {
      sourcePath: relativePosix(SCRIPT_ROOT, PUBLIC_EXAMPLE_SELECTION),
      sourceSha256: sha256(selectionRaw),
      bundleSha256: sha256(selectionRaw),
      license: selection.license,
    },
    example: {
      id: "player-show-complete-cue-tracks",
      path: PUBLIC_EXAMPLE_DESTINATION,
      title,
      topic: selection.topic,
      audience: selection.audience,
      license: selection.license,
      stability: selection.stability,
      compatibility: selection.compatibility,
      files: files.map(({ source: _source, bytes: _bytes, ...file }) => file),
    },
    files,
  };
}

export async function buildCreatorKitCandidate({
  sourceRoot = DEFAULT_SOURCE,
  outputDir = DEFAULT_OUTPUT,
  version = "0.1.0-rc.2",
  sourceCommit = gitHead(),
  sourceRepository = EXAMPLES_REPOSITORY,
  includePublicExamples = true,
} = {}) {
  if (sourceRepository !== EXAMPLES_REPOSITORY) fail("source_repository", `The reviewed generator accepts ${EXAMPLES_REPOSITORY} as its only source repository`);
  const source = path.resolve(sourceRoot);
  const output = path.resolve(outputDir);
  assertSafeOutputDir(output, source);
  if (![DEFAULT_SOURCE, NEGATIVE_SOURCE].some((root) => isWithin(root, source))) {
    fail("synthetic_source_required", "The reviewed Examples generator accepts only tracked fixture roots");
  }
  if (!/^[a-f0-9]{40}$/u.test(sourceCommit)) fail("source_commit_required", "Synthetic bundles require an exact 40-character source commit");
  const sourceFiles = (await walk(source)).filter((file) => /\.(md|mdx)$/u.test(file)).sort((left, right) => left.localeCompare(right));
  const sourcePaths = new Set(sourceFiles.map((file) => relativePosix(source, file)));
  const documents = [];
  for (const file of sourceFiles) {
    const sourcePath = relativePosix(source, file);
    if (!sourcePath.startsWith("en/")) fail("locale_not_allowed", `${sourcePath} is not an English fixture path`);
    const raw = await readFile(file, "utf8");
    verifySourceAtCommit(file, sourcePath, sourceCommit, raw);
    const parsed = parseFrontmatter(raw);
    const agentExport = parsed.data.agentExport;
    if (!agentExport || agentExport.include !== true || agentExport.audience !== "partner-maker") fail("invalid_agent_export", `${sourcePath} must explicitly opt into partner-maker export`);
    if (agentExport.license !== "spectoda-creator-kit-synthetic" || agentExport.publicDerivative !== true || !agentExport.sourceLock) fail("license_not_allowed", `${sourcePath} has no synthetic redistribution lock`);
    if (agentExport.sourceLock !== SYNTHETIC_SOURCE_LOCK) fail("source_lock_mismatch", `${sourcePath} has an unapproved synthetic fixture lock`);
    const title = typeof parsed.data.title === "string" ? parsed.data.title.trim() : "";
    const summary = typeof parsed.data.summary === "string" ? parsed.data.summary.trim() : "";
    if (!title || !summary) fail("metadata_required", `${sourcePath} needs title and summary`);
    const metadataFinding = credentialFinding(JSON.stringify({ title, summary, agentExport }));
    if (metadataFinding) fail("public_safety", `${sourcePath} metadata matched ${metadataFinding}`);
    if (metadataContainsUrl(`${title}\n${summary}`)) fail("unsafe_link", `${sourcePath} metadata contains a URL`);
    const content = normalizeMarkdown(parsed.content, sourcePath);
    const finding = credentialFinding(content);
    if (finding) fail("public_safety", `${sourcePath} matched ${finding}`);
    documents.push({
      id: `${sourcePath.replace(/\.(md|mdx)$/u, "").replace(/\//g, "__")}__${path.extname(sourcePath).slice(1)}`,
      sourcePath,
      path: `documents/${sourcePath}`,
      title,
      summary,
      format: path.extname(sourcePath).slice(1),
      content,
      sourceSha256: sha256(raw),
      sha256: sha256(content),
      agentExport: { include: true, audience: agentExport.audience, license: agentExport.license, sourceLock: agentExport.sourceLock },
    });
  }
  if (documents.length === 0) fail("no_documents", "Synthetic fixture contains no English documents");
  const documentIds = new Set();
  for (const document of documents) {
    if (documentIds.has(document.id)) fail("duplicate_document_id", `Synthetic documents produce a duplicate ID: ${document.id}`);
    documentIds.add(document.id);
  }
  for (const document of documents) assertLinks(document.content, document.sourcePath, sourcePaths);
  documents.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  const publicExamples = includePublicExamples ? await loadPublicExamples(sourceCommit) : { selection: null, example: null, files: [] };
  let staging;
  try {
    await mkdir(path.dirname(output), { recursive: true });
    staging = await mkdtemp(path.join(path.dirname(output), ".creator-kit-staging-"));
    await copyTemplates(staging);
    for (const document of documents) {
      const destination = path.join(staging, document.path);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, document.content, "utf8");
    }
    for (const file of publicExamples.files) {
      const destination = path.join(staging, file.path);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.bytes);
    }
    const manifest = {
      schemaVersion: "creator-kit-manifest.v1",
      bundleName: BUNDLE_NAME,
      bundleVersion: version,
      locale: "en",
      contentScope: "synthetic-fixture-with-public-examples",
      source: { repository: sourceRepository, commit: sourceCommit },
      documents: documents.map(({ content: _content, ...document }) => document),
      examples: publicExamples.example ? [publicExamples.example] : [],
    };
    const sourceLock = {
      schemaVersion: "creator-kit-source-lock.v1",
      repository: sourceRepository,
      commit: sourceCommit,
      files: [
        ...documents.map((document) => ({ sourcePath: document.sourcePath, sourceSha256: document.sourceSha256, bundleSha256: document.sha256, license: document.agentExport.license })),
        ...(publicExamples.selection ? [{ ...publicExamples.selection, role: "selection" }] : []),
        ...publicExamples.files.map((file) => ({ sourcePath: file.sourcePath, sourceSha256: file.sourceSha256, bundleSha256: file.sha256, license: publicExamples.example.license })),
      ].sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)),
    };
    await writeJson(path.join(staging, "bundle.json"), {
      schemaVersion: "creator-kit-bundle.v1",
      name: BUNDLE_NAME,
      version,
      status: "candidate",
      locale: "en",
      contentScope: "synthetic-fixture-with-public-examples",
      sourceOfTruth: { documents: "synthetic-fixture", examples: EXAMPLES_REPOSITORY },
      transport: { apiVersion: "github-release-v1", stableChannelDescriptor: "stable-channel.json" },
    });
    await writeJson(path.join(staging, "manifest.json"), manifest);
    await writeJson(path.join(staging, "source-lock.json"), sourceLock);
    await writeJson(path.join(staging, "licenses.json"), {
      schemaVersion: "creator-kit-licenses.v1",
      publicationAllowed: false,
      realDocumentationExportAllowed: false,
      scope: "synthetic-fixture-and-public-examples",
      entries: ["spectoda-creator-kit-synthetic", "MIT"],
    });
    await writeJson(path.join(staging, "compatibility.json"), {
      schemaVersion: "creator-kit-compatibility.v1",
      bundleName: BUNDLE_NAME,
      formatVersion: 1,
      locale: "en",
      agents: ["codex", "claude"],
      transport: "github-release-v1",
      updatePolicy: "exact-version-partner-approved",
      firmware: publicExamples.example?.compatibility.firmware ?? null,
      wasm: publicExamples.example?.compatibility.wasm ?? null,
    });
    await writeJson(path.join(staging, "selection.json"), {
      schemaVersion: "creator-kit-selection.v1",
      failClosed: true,
      selectedDocuments: documents.map((document) => ({ sourcePath: document.sourcePath, agentExport: document.agentExport })),
      selectedExamples: publicExamples.example ? [{ id: publicExamples.example.id, selectionSourcePath: publicExamples.selection.sourcePath, files: publicExamples.example.files.map((file) => file.sourcePath) }] : [],
    });
    await writeJson(path.join(staging, "indexes", "documents.json"), {
      schemaVersion: "creator-kit-document-index.v1",
      documents: documents.map(({ content: _content, sourceSha256: _sourceSha256, ...document }) => document),
    });
    await writeJson(path.join(staging, "indexes", "terms.json"), {
      schemaVersion: "creator-kit-term-index.v1",
      terms: terms(documents),
    });
    await writeFile(path.join(staging, "checksums.sha256"), await createChecksums(staging), "utf8");
    const files = await bundleFiles(staging);
    const totalBytes = (await Promise.all(files.map(async (file) => (await stat(file)).size))).reduce((total, size) => total + size, 0);
    if (totalBytes > 5242880) fail("bundle_too_large", `Bundle exceeds the 5 MiB candidate limit: ${totalBytes}`);
    const checksumDigest = sha256(await readFile(path.join(staging, "checksums.sha256")));
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
    staging = null;
    return {
      version,
      sourceCommit,
      documentCount: documents.length,
      exampleCount: publicExamples.example ? 1 : 0,
      totalBytes,
      fileCount: files.length,
      checksumDigest,
      exporterVersion: EXPORTER_VERSION,
    };
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
  }
}

function octal(value, width) {
  const digits = Math.floor(value).toString(8);
  return `${digits.padStart(width - 1, "0")}\0`;
}

function field(buffer, offset, length, value) {
  Buffer.from(value).copy(buffer, offset, 0, Math.min(Buffer.byteLength(value), length));
}

export async function createDeterministicTar(sourceRoot, archivePath, epoch = 0) {
  const files = await walk(sourceRoot);
  const chunks = [];
  for (const file of files.sort((left, right) => relativePosix(sourceRoot, left).localeCompare(relativePosix(sourceRoot, right)))) {
    const relative = relativePosix(sourceRoot, file);
    if (Buffer.byteLength(relative) > 100) fail("archive_path", `Archive path is longer than ustar allows: ${relative}`);
    const content = await readFile(file);
    const header = Buffer.alloc(512);
    field(header, 0, 100, relative);
    field(header, 100, 8, "0000644\0");
    field(header, 108, 8, "0000000\0");
    field(header, 116, 8, "0000000\0");
    field(header, 124, 12, octal(content.length, 12));
    field(header, 136, 12, octal(epoch, 12));
    header.fill(0x20, 148, 156);
    header[156] = 0x30;
    field(header, 257, 6, "ustar\0");
    field(header, 263, 2, "00");
    const checksum = [...header].reduce((total, byte) => total + byte, 0);
    field(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
    chunks.push(header, content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding) chunks.push(Buffer.alloc(padding));
  }
  chunks.push(Buffer.alloc(1024));
  await mkdir(path.dirname(archivePath), { recursive: true });
  await writeFile(archivePath, Buffer.concat(chunks));
  return { archivePath, sha256: sha256(await readFile(archivePath)), fileCount: files.length };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const [key, inline] = argument.slice(2).split("=", 2);
    options[key] = inline ?? argv[++index];
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await buildCreatorKitCandidate({
    sourceRoot: options.source ?? DEFAULT_SOURCE,
    outputDir: options.output ?? DEFAULT_OUTPUT,
    version: options.version ?? "0.1.0-rc.2",
    sourceCommit: options["source-commit"] ?? gitHead(),
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Creator Kit Examples build failed [${error.code ?? "unknown"}]: ${error.message}`);
    process.exitCode = 1;
  });
}
