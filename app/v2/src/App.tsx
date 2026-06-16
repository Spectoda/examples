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
    <div className="shell">
      <div className="version-badge">Examples v2</div>
      <nav className="topbar">
        <button type="button" className="logo logo-btn" onClick={goHome}>
          Spectoda Examples
        </button>
        <span className="dim topbar-sub">Public, copyable controller &amp; Berry examples</span>
      </nav>
      <main className="content">
        {route.name === 'catalog' && <Catalog />}
        {route.name === 'example' && <Detail slug={route.slug} />}
      </main>
    </div>
  );
}
