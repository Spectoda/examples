import { useMemo, useState } from 'react';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  loadExamples,
  type Example,
  type ExampleCategory,
} from './examplesData';

function matches(ex: Example, query: string): boolean {
  if (!query) return true;
  const hay = [ex.title, ex.summary, ex.slug, ...ex.tags].join(' ').toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

export function Catalog() {
  const all = useMemo(() => loadExamples(), []);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => all.filter((ex) => matches(ex, query)), [all, query]);

  const byCategory = useMemo(() => {
    const groups: Record<string, Example[]> = {};
    for (const ex of filtered) {
      (groups[ex.category] ??= []).push(ex);
    }
    return groups;
  }, [filtered]);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Public · copyable</p>
        <h1>
          Spectoda <span className="gradient-text">examples</span>
        </h1>
        <p className="lead">
          {all.length} copyable examples — controller setups, Berry scripts, TNGL
          snippets and Spectoda App patterns. Pick one, read the notes, copy the files.
        </p>
        <input
          className="search"
          type="search"
          placeholder="Filter by name, tag or keyword…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter examples"
        />
      </section>

      {filtered.length === 0 && (
        <div className="panel empty">No example matches “{query}”.</div>
      )}

      <div className="catalog">
        {CATEGORY_ORDER.map((category) => {
          const items = byCategory[category];
          if (!items || items.length === 0) return null;
          return (
            <section key={category} className="category-section">
              <h2 className="category-title">
                {CATEGORY_LABELS[category as ExampleCategory]}
                <span className="count">{items.length}</span>
              </h2>
              <div className="example-grid">
                {items.map((ex) => (
                  <a
                    key={ex.slug}
                    className="example-card"
                    href={`#example/${encodeURIComponent(ex.slug)}`}
                  >
                    <strong>{ex.title}</strong>
                    <span className="summary">{ex.summary}</span>
                    <div className="tag-row">
                      {ex.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="file-count">
                      {ex.files.length + 1} file{ex.files.length === 0 ? '' : 's'}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
