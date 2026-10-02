import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExamples, CATEGORY_ORDER } from './examplesCatalog';

// Feeds the committed data/v2 examples to the catalog the same way the Vite
// glob in examplesData.ts does: raw file contents keyed by their path.
const examplesRoot = fileURLToPath(new URL('../../../data/v2/examples', import.meta.url));
const sourceFile = /\.(md|be|tngl|json|mts)$/;

function readCommittedExamples() {
  const metaModules: Record<string, string> = {};
  const fileModules: Record<string, string> = {};
  for (const slug of readdirSync(examplesRoot)) {
    const dir = join(examplesRoot, slug);
    for (const name of readdirSync(dir)) {
      const key = `../../../data/v2/examples/${slug}/${name}`;
      if (name === 'example.yaml') metaModules[key] = readFileSync(join(dir, name), 'utf8');
      else if (sourceFile.test(name)) fileModules[key] = readFileSync(join(dir, name), 'utf8');
    }
  }
  return { metaModules, fileModules };
}

describe('examples catalog over data/v2', () => {
  const { metaModules, fileModules } = readCommittedExamples();
  const examples = buildExamples(metaModules, fileModules);

  test('every committed example.yaml becomes a catalog entry', () => {
    expect(examples.length).toBe(Object.keys(metaModules).length);
    expect(new Set(examples.map((e) => e.slug)).size).toBe(examples.length);
  });

  test('every declared file resolves to non-empty content and a known category', () => {
    for (const example of examples) {
      expect(CATEGORY_ORDER).toContain(example.category);
      for (const file of example.files) {
        expect(`${example.slug}/${file.path}: ${file.content.length > 0}`).toBe(
          `${example.slug}/${file.path}: true`,
        );
      }
    }
  });

  test('entries are ordered by category, then title', () => {
    const keys = examples.map((e) => [CATEGORY_ORDER.indexOf(e.category), e.title] as const);
    const sorted = [...keys].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
    expect(keys).toEqual(sorted);
  });

  test('a malformed or incomplete example.yaml is skipped, not fatal', () => {
    const result = buildExamples(
      {
        'x/broken/example.yaml': 'slug: [unclosed',
        'x/partial/example.yaml': 'slug: partial\ntitle: Partial',
      },
      {},
    );
    expect(result).toEqual([]);
  });
});
