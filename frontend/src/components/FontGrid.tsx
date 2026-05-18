import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { api, type FontFamily } from '../lib/wails';
import { listQueryFromFilters, useStore } from '../state/store';
import { FontCard } from './FontCard';

const PAGE_SIZE = 60;
const DEBOUNCE_MS = 250;

export function FontGrid() {
  const filters = useStore((s) => s.filters);
  const setInstalled = useStore((s) => s.setInstalled);

  const [items, setItems] = useState<FontFamily[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const result = await api.listFonts(listQueryFromFilters(filters, offset, PAGE_SIZE));
        if (id !== requestId.current) return;
        setTotal(result.total);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        if (!append && result.items.length > 0) {
          const families = result.items.map((f) => f.family);
          api.scanInstalled(families).then((found) => {
            if (id === requestId.current) setInstalled(found ?? {});
          }).catch(() => {});
        }
      } catch (err: any) {
        if (id === requestId.current) setError(String(err?.message ?? err));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [filters, setInstalled],
  );

  // Debounce filter changes; reset to offset=0.
  useEffect(() => {
    const handle = setTimeout(() => {
      fetchPage(0, false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [fetchPage]);

  const hasMore = items.length < total;

  const header = useMemo(
    () => (
      <div className="grid-status">
        {error ? (
          <span className="error">Error: {error}</span>
        ) : (
          <span>
            {loading && items.length === 0
              ? 'Loading…'
              : `Showing ${items.length} of ${total}`}
          </span>
        )}
      </div>
    ),
    [items.length, total, loading, error],
  );

  const footer = useMemo(() => {
    if (!hasMore) return <div className="grid-footer" />;
    return (
      <div className="grid-footer">
        <button
          className="btn-secondary"
          disabled={loading}
          onClick={() => fetchPage(items.length, true)}
        >
          {loading ? '[ LOADING… ]' : '[ LOAD MORE ]'}
        </button>
      </div>
    );
  }, [hasMore, loading, items.length, fetchPage]);

  return (
    <div className="font-grid">
      {header}
      <Virtuoso
        style={{ flex: 1 }}
        data={items}
        components={{ Footer: () => footer }}
        itemContent={(_, font) => <FontCard key={font.family} font={font} />}
        overscan={400}
      />
    </div>
  );
}
