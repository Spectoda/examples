import { useCallback, useEffect, useState } from 'react';
import { Catalog } from './Catalog';
import { Detail } from './Detail';

type Route = { name: 'catalog' } | { name: 'example'; slug: string };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith('example/')) {
    const raw = h.slice('example/'.length);
    let slug = raw;
    try {
      slug = decodeURIComponent(raw);
    } catch {
      // Malformed percent-encoding — fall back to the raw value instead of
      // throwing and breaking routing.
    }
    return { name: 'example', slug };
  }
  return { name: 'catalog' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const fn = () => setRoute(parseHash());
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);

  const goHome = useCallback(() => {
    window.location.hash = '';
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button type="button" className="brand brand-link" onClick={goHome}>
          <img className="brand-mark" src="/spectoda-favicon.svg" alt="Spectoda" />
          <span className="brand-name">Spectoda</span>
          <span className="brand-sep">/</span>
          <span className="brand-app">Examples</span>
        </button>
        <span className="pill">Examples v2</span>
      </header>

      {route.name === 'catalog' && <Catalog />}
      {route.name === 'example' && <Detail slug={route.slug} />}
    </main>
  );
}
