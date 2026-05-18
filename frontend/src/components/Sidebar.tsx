import { useEffect, useState } from 'react';
import { api } from '../lib/wails';
import { useStore } from '../state/store';
import { FilterSection } from './FilterSection';
import { PixelHeader } from './PixelHeader';

const SORTS: { value: string; label: string }[] = [
  { value: 'alpha', label: 'alphabetical' },
  { value: 'popularity', label: 'popularity' },
  { value: 'trending', label: 'trending' },
  { value: 'date', label: 'newest' },
  { value: 'style', label: 'most variants' },
];

export function Sidebar() {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);

  const [categories, setCategories] = useState<string[]>([]);
  const [subsets, setSubsets] = useState<string[]>([]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getSubsets().then(setSubsets).catch(() => {});
  }, []);

  return (
    <aside className="sidebar">
      <PixelHeader />
      <FilterSection
        title="Sort"
        value={filters.sort}
        options={SORTS}
        onChange={(v) => setFilter('sort', v)}
        defaultOpen
      />
      <FilterSection
        title="Category"
        value={filters.category}
        options={[{ value: '', label: 'all' }, ...categories.map((c) => ({ value: c, label: c }))]}
        onChange={(v) => setFilter('category', v)}
        defaultOpen
      />
      <FilterSection
        title="Language"
        value={filters.subset}
        options={[{ value: '', label: 'all' }, ...subsets.map((s) => ({ value: s, label: s }))]}
        onChange={(v) => setFilter('subset', v)}
        defaultOpen={false}
      />
    </aside>
  );
}
