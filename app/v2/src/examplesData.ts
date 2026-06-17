import YAML from 'yaml';

export type ExampleLanguage = 'berry' | 'tngl' | 'json' | 'markdown';
export type ExampleCategory = 'controller' | 'espnow-remote' | 'network-pattern';

export type ExampleFileMeta = {
  path: string;
  role: string;
  language: ExampleLanguage;
};

export type ExampleFile = ExampleFileMeta & { content: string };

type ExampleMeta = {
  schemaVersion?: string;
  slug: string;
  title: string;
  category: ExampleCategory;
  summary: string;
  tags: string[];
  hardware: string;
  files: ExampleFileMeta[];
  related?: string[];
};

export type Example = {
  slug: string;
  title: string;
  category: ExampleCategory;
  summary: string;
  tags: string[];
  hardware: string;
  readme: string;
  files: ExampleFile[];
  related: string[];
};

export const CATEGORY_ORDER: ExampleCategory[] = [
  'controller',
  'espnow-remote',
  'network-pattern',
];

export const CATEGORY_LABELS: Record<ExampleCategory, string> = {
  controller: 'Controller setups',
  'espnow-remote': 'ESP-NOW remotes',
  'network-pattern': 'App / network patterns',
};

// Build-time read of the data/v2 examples. Metadata sidecars and source files
// are bundled at build time (no runtime fetch, no Firebase).
const metaModules = import.meta.glob('../../../data/v2/examples/*/example.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const fileModules = import.meta.glob('../../../data/v2/examples/*/*.{md,be,tngl,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function slugFromKey(key: string): string {
  const parts = key.split('/');
  return parts[parts.length - 2] ?? '';
}

function fileNameFromKey(key: string): string {
  const parts = key.split('/');
  return parts[parts.length - 1] ?? '';
}

// slug -> (filename -> raw content)
function buildFileIndex(): Record<string, Record<string, string>> {
  const index: Record<string, Record<string, string>> = {};
  for (const [key, content] of Object.entries(fileModules)) {
    const slug = slugFromKey(key);
    const name = fileNameFromKey(key);
    if (!index[slug]) index[slug] = {};
    index[slug][name] = content;
  }
  return index;
}

let cache: Example[] | null = null;

export function loadExamples(): Example[] {
  if (cache) return cache;

  const fileIndex = buildFileIndex();
  const examples: Example[] = [];

  for (const [key, raw] of Object.entries(metaModules)) {
    let meta: ExampleMeta;
    try {
      meta = YAML.parse(raw) as ExampleMeta;
    } catch (err) {
      // One malformed example.yaml must not break the whole catalog.
      console.warn(`Skipping example with invalid example.yaml (${key}):`, err);
      continue;
    }
    // Skip entries missing the fields the catalog/detail render and sort on,
    // so one incomplete example.yaml cannot crash or distort the catalog.
    if (!meta || !meta.slug || !meta.title || !meta.category || !meta.summary) {
      console.warn(
        `Skipping example with incomplete example.yaml (${key}); requires slug, title, category, summary.`,
      );
      continue;
    }

    const folderFiles = fileIndex[meta.slug] ?? {};
    const readme = folderFiles['README.md'] ?? '';

    const files: ExampleFile[] = (meta.files ?? [])
      .filter((f) => f.path !== 'README.md')
      .map((f) => ({ ...f, content: folderFiles[f.path] ?? '' }));

    examples.push({
      slug: meta.slug,
      title: meta.title,
      category: meta.category,
      summary: meta.summary,
      tags: meta.tags ?? [],
      hardware: meta.hardware ?? '',
      readme,
      files,
      related: meta.related ?? [],
    });
  }

  // Deterministic ordering: by category, then title.
  examples.sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.title.localeCompare(b.title);
  });

  cache = examples;
  return examples;
}

export function findExample(slug: string): Example | undefined {
  return loadExamples().find((e) => e.slug === slug);
}
