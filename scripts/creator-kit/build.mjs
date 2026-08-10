import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const BUNDLE_NAME = "Spectoda Creator Kit";
export const BUNDLE_VERSION = "0.1.0-rc.4";
export const EXPORTER_VERSION = "examples-creator-kit-packager/1.2.0";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const relativePosix = (root, absolute) => path.relative(root, absolute).split(path.sep).join("/");

export async function walkFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
      else throw new Error(`Creator Kit contains an unsupported filesystem entry: ${relativePosix(root, absolute)}`);
    }
  }
  await visit(root);
  return files;
}

export async function bundleFiles(root) {
  return (await walkFiles(root)).filter((file) => relativePosix(root, file) !== "checksums.sha256");
}

export async function createChecksums(root) {
  const lines = [];
  for (const file of await bundleFiles(root)) {
    lines.push(`${sha256(await readFile(file))}  ${relativePosix(root, file)}`);
  }
  return `${lines.sort().join("\n")}\n`;
}

export async function verifyChecksums(root) {
  const expected = await readFile(path.join(root, "checksums.sha256"), "utf8");
  const actual = await createChecksums(root);
  if (expected !== actual) throw new Error("checksums.sha256 does not match the committed Creator Kit snapshot");
  return {
    count: expected.trim().split("\n").filter(Boolean).length,
    digest: sha256(expected),
  };
}

function octal(value, width) {
  const digits = Math.floor(value).toString(8);
  return `${digits.padStart(width - 1, "0")}\0`;
}

function field(buffer, offset, length, value) {
  Buffer.from(value).copy(buffer, offset, 0, Math.min(Buffer.byteLength(value), length));
}

export async function createDeterministicTar(sourceRoot, archivePath, epoch = 0) {
  const files = await walkFiles(sourceRoot);
  const chunks = [];
  for (const file of files.sort((left, right) => relativePosix(sourceRoot, left).localeCompare(relativePosix(sourceRoot, right)))) {
    const relative = relativePosix(sourceRoot, file);
    if (Buffer.byteLength(relative) > 100) throw new Error(`Archive path is longer than ustar allows: ${relative}`);
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
  const archiveBytes = await readFile(archivePath);
  return { archivePath, sha256: sha256(archiveBytes), fileCount: files.length, bytes: (await stat(archivePath)).size };
}
