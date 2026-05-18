import { useStore } from '../state/store';

type Props = { onRefresh: () => void };

export function Toolbar({ onRefresh }: Props) {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const sampleText = useStore((s) => s.sampleText);
  const setSampleText = useStore((s) => s.setSampleText);
  const sampleSize = useStore((s) => s.sampleSize);
  const setSampleSize = useStore((s) => s.setSampleSize);

  return (
    <div className="toolbar">
      <input
        className="toolbar-input search"
        type="search"
        placeholder="search fonts…"
        value={filters.search}
        onChange={(e) => setFilter('search', e.target.value)}
        autoComplete="off"
      />
      <input
        className="toolbar-input sample-text"
        type="text"
        value={sampleText}
        onChange={(e) => setSampleText(e.target.value)}
        placeholder="preview text…"
      />
      <label className="size-slider" title="Preview size">
        <span>{sampleSize}px</span>
        <input
          type="range"
          min={12}
          max={120}
          value={sampleSize}
          onChange={(e) => setSampleSize(Number(e.target.value))}
        />
      </label>
      <button className="btn-secondary" onClick={onRefresh}>[ REFRESH ]</button>
    </div>
  );
}
