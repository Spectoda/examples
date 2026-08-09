import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

import { BUNDLE_VERSION, bundleFiles, createChecksums, sha256, verifyChecksums } from "./build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_OUTPUT = path.join(ROOT, "creator-kit");
const TEMPLATE_ROOT = path.join(ROOT, "creator-kit-templates");
const EXAMPLE_ID = "player-show-global-sparse-cues";
const EXAMPLE_ROOT = path.join(ROOT, `data/v2/examples/${EXAMPLE_ID}`);
const EXAMPLE_DESTINATION = `examples/${EXAMPLE_ID}`;
const DOCUMENTATION_BUNDLE_VERSION = "0.1.0-rc.3";
const DOCUMENTATION_COMMIT = "6f6051686fe556a85318c7dd529ac061ab48c38d";
const DOCUMENTATION_CHECKSUM_DIGEST = "d4e2958303e3fd34dcb5e5c50a8a5c6a0266068ec2f15d88406a2a33bcb1f054";
const EXAMPLES_COMMIT = "667b238349cc635792f0e42130a08a4bde701fdf";
const FIRMWARE_COMMIT = "51a8d6337d968b47f563bf2decb8f7404d93c27a";
const EXAMPLE_FILES = ["README.md", "example.yaml", "player.be"];

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isStrictDescendant(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertSafeOutput(output, input) {
  const resolved = path.resolve(output);
  const allowed = resolved === DEFAULT_OUTPUT || isStrictDescendant(tmpdir(), resolved);
  if (!allowed || isWithin(resolved, input) || isWithin(input, resolved) || resolved === ROOT) {
    throw new Error("Output must be creator-kit/ or a dedicated OS temporary directory outside the input bundle");
  }
}

function gitBytes(commit, repositoryPath) {
  try {
    return execFileSync("git", ["show", `${commit}:${repositoryPath}`], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
  } catch {
    throw new Error(`${repositoryPath} is unavailable at locked Examples commit ${commit}`);
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await writeFile(file, json(value), "utf8");
}

function appendUnique(array, value) {
  if (!array.includes(value)) array.push(value);
}

async function extendSchemas(staging) {
  const schemaRoot = path.join(staging, "schemas");
  const bundleSchema = await readJson(path.join(schemaRoot, "creator-kit-bundle.v1.schema.json"));
  appendUnique(bundleSchema.properties.contentScope.enum, "licensed-documentation-with-public-examples");
  await writeJson(path.join(schemaRoot, "creator-kit-bundle.v1.schema.json"), bundleSchema);

  const exampleFileSchema = {
    type: "object",
    required: ["sourcePath", "path", "format", "sourceSha256", "sha256"],
    properties: {
      sourcePath: { type: "string", minLength: 1 },
      path: { type: "string", pattern: "^examples/" },
      format: { enum: ["md", "yaml", "be"] },
      sourceSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
      sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    },
    additionalProperties: false,
  };
  const exampleSourceSchema = {
    type: "object",
    required: ["repository", "commit"],
    properties: {
      repository: { const: "Spectoda/examples" },
      commit: { type: "string", pattern: "^[a-f0-9]{40}$" },
    },
    additionalProperties: false,
  };
  const exampleSchema = {
    type: "object",
    required: ["id", "path", "title", "topic", "audience", "license", "stability", "compatibility", "source", "files"],
    properties: {
      id: { const: EXAMPLE_ID },
      path: { const: EXAMPLE_DESTINATION },
      title: { type: "string", minLength: 1 },
      topic: { const: "studio-event-player" },
      audience: { const: "partner-maker" },
      license: { const: "MIT" },
      stability: { const: "firmware-0.12.11" },
      compatibility: {
        type: "object",
        required: ["firmware", "wasm"],
        properties: {
          firmware: { const: "0.12.11" },
          wasm: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
      source: exampleSourceSchema,
      files: { type: "array", minItems: 3, maxItems: 3, items: exampleFileSchema },
    },
    additionalProperties: false,
  };

  const manifestSchema = await readJson(path.join(schemaRoot, "creator-kit-manifest.v1.schema.json"));
  appendUnique(manifestSchema.required, "examples");
  appendUnique(manifestSchema.properties.contentScope.enum, "licensed-documentation-with-public-examples");
  manifestSchema.properties.examples = { type: "array", minItems: 1, maxItems: 1, items: exampleSchema };
  await writeJson(path.join(schemaRoot, "creator-kit-manifest.v1.schema.json"), manifestSchema);

  const sourceLockSchema = await readJson(path.join(schemaRoot, "creator-kit-source-lock.v1.schema.json"));
  appendUnique(sourceLockSchema.required, "documentationBundle");
  appendUnique(sourceLockSchema.required, "examples");
  sourceLockSchema.properties.documentationBundle = {
    type: "object",
    required: ["repository", "commit", "exporterVersion", "checksumDigest"],
    properties: {
      repository: { const: "Spectoda/documentation" },
      commit: { type: "string", pattern: "^[a-f0-9]{40}$" },
      exporterVersion: { type: "string", minLength: 1 },
      checksumDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
    },
    additionalProperties: false,
  };
  sourceLockSchema.properties.examples = {
    type: "array",
    minItems: 4,
    maxItems: 4,
    items: {
      type: "object",
      required: ["role", "sourcePath", "bundlePath", "sourceSha256", "bundleSha256", "license", "source"],
      properties: {
        role: { enum: ["selection", "file"] },
        sourcePath: { type: "string", minLength: 1 },
        bundlePath: { type: ["string", "null"] },
        sourceSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        bundleSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        license: { const: "MIT" },
        source: exampleSourceSchema,
      },
      additionalProperties: false,
    },
  };
  await writeJson(path.join(schemaRoot, "creator-kit-source-lock.v1.schema.json"), sourceLockSchema);

  const selectionSchema = await readJson(path.join(schemaRoot, "creator-kit-selection.v1.schema.json"));
  appendUnique(selectionSchema.required, "selectedExamples");
  selectionSchema.properties.selectedExamples = {
    type: "array",
    minItems: 1,
    maxItems: 1,
    items: {
      type: "object",
      required: ["id", "selectionSourcePath", "source", "files"],
      properties: {
        id: { const: EXAMPLE_ID },
        selectionSourcePath: { type: "string", minLength: 1 },
        source: exampleSourceSchema,
        files: { type: "array", minItems: 3, maxItems: 3, items: { type: "string", minLength: 1 } },
      },
      additionalProperties: false,
    },
  };
  await writeJson(path.join(schemaRoot, "creator-kit-selection.v1.schema.json"), selectionSchema);

  const licensesSchema = await readJson(path.join(schemaRoot, "creator-kit-licenses.v1.schema.json"));
  appendUnique(licensesSchema.properties.scope.enum, "licensed-documentation-with-public-examples");
  await writeJson(path.join(schemaRoot, "creator-kit-licenses.v1.schema.json"), licensesSchema);
}

export async function importDocumentationSnapshot({ documentationBundle, outputDir = DEFAULT_OUTPUT } = {}) {
  if (!documentationBundle) throw new Error("--documentation-bundle is required");
  const input = path.resolve(documentationBundle);
  const output = path.resolve(outputDir);
  assertSafeOutput(output, input);
  const documentationChecksums = await verifyChecksums(input);
  if (documentationChecksums.digest !== DOCUMENTATION_CHECKSUM_DIGEST) {
    throw new Error(`Documentation bundle digest is not the authorized ${DOCUMENTATION_CHECKSUM_DIGEST}`);
  }
  const sourceLock = await readJson(path.join(input, "source-lock.json"));
  const bundle = await readJson(path.join(input, "bundle.json"));
  const manifest = await readJson(path.join(input, "manifest.json"));
  const licenses = await readJson(path.join(input, "licenses.json"));
  const stable = await readJson(path.join(input, "stable-channel.json"));
  if (
    bundle.version !== DOCUMENTATION_BUNDLE_VERSION ||
    bundle.contentScope !== "licensed-documentation" ||
    sourceLock.repository !== "Spectoda/documentation" ||
    sourceLock.commit !== DOCUMENTATION_COMMIT ||
    manifest.source?.commit !== DOCUMENTATION_COMMIT ||
    manifest.documents?.length !== 7 ||
    manifest.assets?.length !== 2 ||
    licenses.publicationAllowed !== true ||
    licenses.realDocumentationExportAllowed !== true ||
    licenses.entries?.join("\n") !== "CC-BY-4.0" ||
    stable.state !== "unpublished"
  ) {
    throw new Error("Documentation bundle does not match the authorized rc.3 publication contract");
  }
  if (!manifest.assets.every((asset) => asset.upstreamSource?.repository === "Spectoda/firmware" && asset.upstreamSource.commit === FIRMWARE_COMMIT)) {
    throw new Error("Controller Config assets do not match the authorized firmware provenance");
  }

  const selectionPath = `data/v2/examples/${EXAMPLE_ID}/creator-kit.json`;
  const selectionBytes = await readFile(path.join(ROOT, selectionPath));
  if (!selectionBytes.equals(gitBytes(EXAMPLES_COMMIT, selectionPath))) throw new Error("Event Player selection differs from the locked Examples commit");
  const exampleSelection = JSON.parse(selectionBytes.toString("utf8"));
  if (
    exampleSelection.include !== true ||
    exampleSelection.license !== "MIT" ||
    exampleSelection.compatibility?.firmware !== "0.12.11" ||
    JSON.stringify(exampleSelection.files) !== JSON.stringify(EXAMPLE_FILES)
  ) {
    throw new Error("Event Player selection is outside the reviewed Creator Kit contract");
  }

  const stagingParent = path.join(ROOT, ".creator-kit-tmp");
  await mkdir(stagingParent, { recursive: true });
  let staging = await mkdtemp(path.join(stagingParent, "import-"));
  try {
    await cp(input, staging, { recursive: true, force: true });
    await rm(path.join(staging, "checksums.sha256"), { force: true });
    const exampleFiles = [];
    for (const name of EXAMPLE_FILES) {
      const sourcePath = `data/v2/examples/${EXAMPLE_ID}/${name}`;
      const bytes = await readFile(path.join(ROOT, sourcePath));
      if (!bytes.equals(gitBytes(EXAMPLES_COMMIT, sourcePath))) throw new Error(`${sourcePath} differs from the locked Examples commit`);
      const bundlePath = `${EXAMPLE_DESTINATION}/${name}`;
      await mkdir(path.dirname(path.join(staging, bundlePath)), { recursive: true });
      await writeFile(path.join(staging, bundlePath), bytes);
      exampleFiles.push({
        sourcePath,
        path: bundlePath,
        format: path.extname(name).slice(1),
        sourceSha256: sha256(bytes),
        sha256: sha256(bytes),
      });
    }
    const title = exampleFiles.find((file) => file.path.endsWith("README.md"))
      ? (await readFile(path.join(staging, EXAMPLE_DESTINATION, "README.md"), "utf8")).match(/^#\s+(.+)$/mu)?.[1]?.trim()
      : null;
    if (!title) throw new Error("Event Player README has no title");

    bundle.version = BUNDLE_VERSION;
    bundle.contentScope = "licensed-documentation-with-public-examples";
    manifest.bundleVersion = BUNDLE_VERSION;
    manifest.contentScope = bundle.contentScope;
    manifest.examples = [{
      id: EXAMPLE_ID,
      path: EXAMPLE_DESTINATION,
      title,
      topic: exampleSelection.topic,
      audience: exampleSelection.audience,
      license: "MIT",
      stability: exampleSelection.stability,
      compatibility: exampleSelection.compatibility,
      source: { repository: "Spectoda/examples", commit: EXAMPLES_COMMIT },
      files: exampleFiles,
    }];
    sourceLock.documentationBundle = {
      repository: "Spectoda/documentation",
      commit: DOCUMENTATION_COMMIT,
      exporterVersion: sourceLock.exporterVersion,
      checksumDigest: DOCUMENTATION_CHECKSUM_DIGEST,
    };
    sourceLock.examples = [
      {
        role: "selection",
        sourcePath: selectionPath,
        bundlePath: null,
        sourceSha256: sha256(selectionBytes),
        bundleSha256: sha256(selectionBytes),
        license: "MIT",
        source: { repository: "Spectoda/examples", commit: EXAMPLES_COMMIT },
      },
      ...exampleFiles.map((file) => ({
        role: "file",
        sourcePath: file.sourcePath,
        bundlePath: file.path,
        sourceSha256: file.sourceSha256,
        bundleSha256: file.sha256,
        license: "MIT",
        source: { repository: "Spectoda/examples", commit: EXAMPLES_COMMIT },
      })),
    ];
    const selection = await readJson(path.join(staging, "selection.json"));
    selection.selectedExamples = [{
      id: EXAMPLE_ID,
      selectionSourcePath: selectionPath,
      source: { repository: "Spectoda/examples", commit: EXAMPLES_COMMIT },
      files: exampleFiles.map((file) => file.sourcePath),
    }];
    licenses.scope = "licensed-documentation-with-public-examples";
    licenses.entries = ["CC-BY-4.0", "MIT"];

    await writeJson(path.join(staging, "bundle.json"), bundle);
    await writeJson(path.join(staging, "manifest.json"), manifest);
    await writeJson(path.join(staging, "source-lock.json"), sourceLock);
    await writeJson(path.join(staging, "selection.json"), selection);
    await writeJson(path.join(staging, "licenses.json"), licenses);
    await writeFile(
      path.join(staging, "README.md"),
      (await readFile(path.join(TEMPLATE_ROOT, "README.md"), "utf8"))
        .replaceAll("{{BUNDLE_VERSION}}", BUNDLE_VERSION)
        .replaceAll("{{EXAMPLES_COMMIT}}", EXAMPLES_COMMIT),
    );
    await writeFile(path.join(staging, "AGENTS.md"), await readFile(path.join(TEMPLATE_ROOT, "AGENTS.md")));
    await writeFile(path.join(staging, "RELEASE_NOTES.md"), await readFile(path.join(TEMPLATE_ROOT, "RELEASE_NOTES.md")));
    await mkdir(path.join(staging, "LICENSES"), { recursive: true });
    await writeFile(path.join(staging, "LICENSES", "MIT.txt"), await readFile(path.join(ROOT, "LICENSE")));
    await extendSchemas(staging);
    await writeFile(path.join(staging, "checksums.sha256"), await createChecksums(staging), "utf8");
    const totalBytes = (await Promise.all((await bundleFiles(staging)).map(async (file) => (await stat(file)).size)))
      .reduce((sum, size) => sum + size, 0);
    if (totalBytes > 8 * 1024 * 1024) throw new Error(`Combined Creator Kit is larger than 8 MiB: ${totalBytes}`);
    await rm(output, { recursive: true, force: true });
    await rename(staging, output);
    staging = null;
    const combinedChecksums = await verifyChecksums(output);
    return {
      version: BUNDLE_VERSION,
      documentationCommit: DOCUMENTATION_COMMIT,
      documentationChecksumDigest: DOCUMENTATION_CHECKSUM_DIGEST,
      examplesCommit: EXAMPLES_COMMIT,
      documentCount: manifest.documents.length,
      assetCount: manifest.assets.length,
      exampleCount: manifest.examples.length,
      totalBytes,
      checksumCount: combinedChecksums.count,
      checksumDigest: combinedChecksums.digest,
    };
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
  }
}

function argValue(argv, name) {
  const index = argv.findIndex((argument) => argument === `--${name}` || argument.startsWith(`--${name}=`));
  if (index === -1) return undefined;
  const argument = argv[index];
  return argument.includes("=") ? argument.slice(argument.indexOf("=") + 1) : argv[index + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  const result = await importDocumentationSnapshot({
    documentationBundle: argValue(argv, "documentation-bundle"),
    outputDir: argValue(argv, "output") ?? DEFAULT_OUTPUT,
  });
  console.log(json(result));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Creator Kit import failed: ${error.message}`);
    process.exitCode = 1;
  });
}
