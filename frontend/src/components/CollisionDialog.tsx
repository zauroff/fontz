import { useState } from 'react';
import { installer } from '../../wailsjs/go/models';
import { api } from '../lib/wails';
import { parseVariant } from '../lib/fontLoader';
import { useStore } from '../state/store';

export function CollisionDialog() {
  const dialog = useStore((s) => s.dialog);
  const closeDialog = useStore((s) => s.closeDialog);
  const mergeInstalled = useStore((s) => s.mergeInstalled);
  const installedMap = useStore((s) => s.installed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dialog.kind !== 'collision') return null;

  const { family, collidingVariants } = dialog;

  const overwrite = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.install(
        installer.InstallRequest.createFrom({
          family: family.family,
          variants: collidingVariants,
          overwrite: true,
        }),
      );
      const installedNow = result.variants
        .filter((v) => v.status === 'installed')
        .map((v) => v.variant);
      if (installedNow.length > 0) {
        const prev = installedMap[family.family] ?? [];
        mergeInstalled(family.family, Array.from(new Set([...prev, ...installedNow])));
      }
      closeDialog();
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeDialog}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Already installed</h2>
          <p>
            {collidingVariants.length} variant{collidingVariants.length === 1 ? '' : 's'} of{' '}
            <strong>{family.family}</strong> already exist in ~/Library/Fonts but weren't installed by Fontz.
            Overwriting will replace whatever is there now.
          </p>
        </header>
        <ul className="variant-list">
          {collidingVariants.map((v) => {
            const { label } = parseVariant(v);
            return <li key={v}><span>{label}</span></li>;
          })}
        </ul>
        {error && <div className="error">{error}</div>}
        <footer className="modal-footer">
          <button className="btn-secondary" onClick={closeDialog} disabled={busy}>[ KEEP EXISTING ]</button>
          <button className="btn-primary danger" onClick={overwrite} disabled={busy}>
            {busy ? '[ OVERWRITING… ]' : '[ OVERWRITE ]'}
          </button>
        </footer>
      </div>
    </div>
  );
}
