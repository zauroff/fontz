import { useEffect, useMemo, useState } from 'react';
import { installer } from '../../wailsjs/go/models';
import { api, type FontFamily, type InstallResult } from '../lib/wails';
import { sortVariants } from '../lib/variants';
import { useStore } from '../state/store';
import { VariantRow } from './VariantRow';

type Props = {
  family: FontFamily;
  alreadyInstalled: string[];
  onCancel: () => void;
  onInstalled: (result: InstallResult) => void;
};

export function VariantPicker({ family, alreadyInstalled, onCancel, onInstalled }: Props) {
  const variants = family.variants;
  const sampleText = useStore((s) => s.sampleText);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const v of variants) map[v] = true;
    return map;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedVariants = useMemo(() => sortVariants(variants), [variants]);

  useEffect(() => {
    setError(null);
  }, [family.family]);

  const toggle = (v: string) =>
    setSelected((s) => ({ ...s, [v]: !s[v] }));

  const submit = async () => {
    const picks = sortedVariants.filter((v) => selected[v]);
    if (picks.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.install(
        installer.InstallRequest.createFrom({
          family: family.family,
          variants: picks,
          overwrite: false,
        }),
      );
      onInstalled(result);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Install {family.family}</h2>
          <p>Tap a row to toggle. Each preview uses the sample text from the toolbar.</p>
        </header>
        <ul className="variant-preview-list">
          {sortedVariants.map((v) => (
            <VariantRow
              key={v}
              family={family}
              variant={v}
              sampleText={sampleText}
              selected={!!selected[v]}
              alreadyInstalled={alreadyInstalled.includes(v)}
              onToggle={() => toggle(v)}
            />
          ))}
        </ul>
        {error && <div className="error">{error}</div>}
        <footer className="modal-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>[ CANCEL ]</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? '[ INSTALLING… ]' : '[ INSTALL ]'}
          </button>
        </footer>
      </div>
    </div>
  );
}
