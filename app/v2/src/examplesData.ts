import { buildExamples, type Example } from './examplesCatalog';

export {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type Example,
  type ExampleCategory,
  type ExampleFile,
  type ExampleFileMeta,
  type ExampleLanguage,
} from './examplesCatalog';

// Build-time read of the data/v2 examples. Metadata sidecars and source files
// are bundled at build time (no runtime fetch, no Firebase).
const metaModules = import.meta.glob('../../../data/v2/examples/*/example.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const fileModules = import.meta.glob('../../../data/v2/examples/*/*.{md,be,tngl,json,mts}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

let cache: Example[] | null = null;

export function loadExamples(): Example[] {
  if (cache) return cache;
  cache = buildExamples(metaModules, fileModules);
  return cache;
}

export function findExample(slug: string): Example | undefined {
  return loadExamples().find((e) => e.slug === slug);
}
