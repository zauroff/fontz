import { useMemo } from 'react';
import { loadVariantOnce, parseVariant } from '../lib/fontLoader';
import type { FontFamily } from '../lib/wails';

const PREVIEW_SIZE = 22;

type Props = {
  family: FontFamily;
  variant: string;
  sampleText: string;
  selected: boolean;
  alreadyInstalled: boolean;
  onToggle: () => void;
};

export function VariantRow({ family, variant, sampleText, selected, alreadyInstalled, onToggle }: Props) {
  const { label } = parseVariant(variant);
  const url = family.files[variant];
  const faceName = useMemo(() => {
    if (!url) return null;
    return loadVariantOnce(family.family, variant, url);
  }, [family.family, variant, url]);

  return (
    <li className={`variant-preview-row${selected ? ' selected' : ''}`}>
      <label className="variant-preview-toggle">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
        />
        <div className="variant-preview-meta">
          <span className="variant-preview-label">{label}</span>
          {alreadyInstalled && <span className="badge subtle">[INSTALLED]</span>}
        </div>
        <div
          className="variant-preview-sample"
          style={{
            fontFamily: faceName ? `"${faceName}", system-ui, sans-serif` : 'system-ui, sans-serif',
            fontSize: `${PREVIEW_SIZE}px`,
          }}
        >
          {sampleText || ' '}
        </div>
      </label>
    </li>
  );
}
