import { useEffect } from 'react';
import { acquireFont, releaseFont } from '../lib/fontLoader';
import { useStore } from '../state/store';
import type { FontFamily } from '../lib/wails';

type Props = { font: FontFamily };

export function FontCard({ font }: Props) {
  const sampleText = useStore((s) => s.sampleText);
  const sampleSize = useStore((s) => s.sampleSize);
  const installed = useStore((s) => s.installed[font.family]);
  const openInstallDialog = useStore((s) => s.openInstallDialog);

  useEffect(() => {
    acquireFont(font.family, font.files);
    return () => releaseFont(font.family);
  }, [font.family, font.files]);

  const isInstalled = !!installed && installed.length > 0;

  return (
    <div className="font-card">
      <div className="font-card-header">
        <div className="font-card-meta">
          <h3 className="font-card-title">{font.family}</h3>
          <p className="font-card-sub">
            {font.category} · {font.variants.length} variant{font.variants.length === 1 ? '' : 's'}
            {isInstalled && <span className="badge"> [INSTALLED]</span>}
          </p>
        </div>
        <button className="btn-primary" onClick={() => openInstallDialog(font)}>
          {isInstalled ? '[ MANAGE ]' : '[ INSTALL ]'}
        </button>
      </div>
      <div
        className="font-card-preview"
        style={{ fontFamily: `"${font.family}", system-ui, sans-serif`, fontSize: `${sampleSize}px` }}
      >
        {sampleText || ' '}
      </div>
    </div>
  );
}
