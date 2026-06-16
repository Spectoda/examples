import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useMemo, useState } from 'react';
import {
  CATEGORY_LABELS,
  findExample,
  type ExampleFile,
} from './examplesData';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function FileBlock({ file }: { file: ExampleFile }) {
  return (
    <div className="file-block">
      <div className="file-head">
        <code className="file-name">{file.path}</code>
        <span className="lang-badge">{file.language}</span>
        <span className="file-role dim">{file.role}</span>
        <CopyButton text={file.content} />
      </div>
      <pre className="code">
        <code>{file.content}</code>
      </pre>
    </div>
  );
}

export function Detail({ slug }: { slug: string }) {
  const example = useMemo(() => findExample(slug), [slug]);

  const readmeHtml = useMemo(
    () =>
      example ? DOMPurify.sanitize(marked.parse(example.readme) as string) : '',
    [example],
  );

  if (!example) {
    return (
      <>
        <a className="back-link" href="#">
          ← Back to examples
        </a>
        <div className="card empty">Example “{slug}” not found.</div>
      </>
    );
  }

  return (
    <>
      <a className="back-link" href="#">
        ← Back to examples
      </a>

      <div className="page-head">
        <div>
          <span className="category-pill">{CATEGORY_LABELS[example.category]}</span>
          <h1>{example.title}</h1>
          <p className="dim">{example.summary}</p>
          <div className="tag-row">
            {example.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="card hardware-panel">
        <h2>Hardware &amp; config</h2>
        <p>{example.hardware}</p>
      </section>

      {example.readme && (
        <section className="card">
          <div
            className="markdown"
            // README markdown is rendered with marked and sanitized with
            // DOMPurify before injection (defense-in-depth for a public repo).
            dangerouslySetInnerHTML={{ __html: readmeHtml }}
          />
        </section>
      )}

      <section className="files-section">
        <h2 className="category-title">Files</h2>
        {example.files.map((file) => (
          <FileBlock key={file.path} file={file} />
        ))}
      </section>

      {example.related.length > 0 && (
        <section className="card">
          <h2>Related examples</h2>
          <div className="related-row">
            {example.related.map((rel) => (
              <a key={rel} className="link-card" href={`#example/${encodeURIComponent(rel)}`}>
                <strong>{rel}</strong>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
