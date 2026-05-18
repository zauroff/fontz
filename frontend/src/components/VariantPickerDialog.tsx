import { useEffect, useMemo, useState } from 'react';
import { api, type FontFamily, type InstallResult } from '../lib/wails';
import { installer } from '../../wailsjs/go/models';
import { loadVariantOnce, parseVariant } from '../lib/fontLoader';
import { useStore } from '../state/store';

const PREVIEW_SIZE = 22;

export function VariantPickerDialog() {
  const dialog = useStore((s) => s.dialog);
  const closeDialog = useStore((s) => s.closeDialog);
  const installedMap = useStore((s) => s.installed);
  const mergeInstalled = useStore((s) => s.mergeInstalled);
  const openCollisionDialog = useStore((s) => s.openCollisionDialog);

  if (dialog.kind !== 'variants') return null;

  return (
    <Picker
      family={dialog.family}
      alreadyInstalled={installedMap[dialog.family.family] ?? []}
      onCancel={closeDialog}
      onInstalled={(result) => {
        const installedNow = result.variants.filter((v) => v.status === 'installed').map((v) => v.variant);
        const collisions = result.variants.filter((v) => v.collision).map((v) => v.variant);
        if (installedNow.length > 0) {
          const prev = installedMap[result.family] ?? [];
          const merged = Array.from(new Set([...prev, ...installedNow]));
          mergeInstalled(result.family, merged);
        }
        if (collisions.length > 0 && dialog.kind === 'variants') {
          openCollisionDialog(dialog.family, result.variants.map((v) => v.variant), collisions);
        } else {
          closeDialog();
        }
      }}
    />
  );
}

type PickerProps = {
  family: FontFamily;
  alreadyInstalled: string[];
  onCancel: () => void;
  onInstalled: (result: InstallResult) => void;
};

function Picker({ family, alreadyInstalled, onCancel, onInstalled }: PickerProps) {
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

type VariantRowProps = {
  family: FontFamily;
  variant: string;
  sampleText: string;
  selected: boolean;
  alreadyInstalled: boolean;
  onToggle: () => void;
};

function VariantRow({ family, variant, sampleText, selected, alreadyInstalled, onToggle }: VariantRowProps) {
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

function variantOrderKey(v: string): number {
  if (v === 'regular') return 400;
  if (v === 'italic') return 400.5;
  const italic = v.endsWith('italic');
  const num = italic ? v.slice(0, -'italic'.length) : v;
  const weight = parseInt(num, 10) || 400;
  return weight + (italic ? 0.5 : 0);
}

function sortVariants(variants: string[]): string[] {
  return [...variants].sort((a, b) => variantOrderKey(a) - variantOrderKey(b));
}

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
      const installedNow = result.variants.filter((v) => v.status === 'installed').map((v) => v.variant);
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
