import { useState } from 'react';
import { api } from '../lib/wails';

const CREDENTIALS_URL = 'https://console.cloud.google.com/apis/credentials';
const ENABLE_API_URL = 'https://console.cloud.google.com/apis/library/webfonts.googleapis.com';

type Props = { onSaved: () => void };

export function ApiKeyDialog({ onSaved }: Props) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openExternal = (url: string) => {
    api.openURL(url).catch(() => {});
  };

  const submit = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setError('Paste your API key first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.setAPIKey(trimmed);
      onSaved();
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>API key required</h2>
          <p>
            Fontz uses the Google Fonts API. Paste a key below to continue — it stays on this machine
            (saved to ~/Library/Application Support/fontz/config.json).
          </p>
        </header>

        <ol className="apikey-steps">
          <li>
            <button className="link-button" type="button" onClick={() => openExternal(CREDENTIALS_URL)}>
              Open Google Cloud Console → APIs &amp; Services → Credentials
            </button>
          </li>
          <li>Click <strong>Create credentials → API key</strong> and copy the value.</li>
          <li>
            <button className="link-button" type="button" onClick={() => openExternal(ENABLE_API_URL)}>
              Enable the Web Fonts Developer API for that project
            </button>{' '}
            (one click — "Enable").
          </li>
          <li>Paste the key here and hit save.</li>
        </ol>

        <input
          className="toolbar-input apikey-input"
          type="text"
          autoFocus
          spellCheck={false}
          placeholder="AIza…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />

        {error && <div className="error">{error}</div>}

        <footer className="modal-footer">
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? '[ VALIDATING… ]' : '[ SAVE KEY ]'}
          </button>
        </footer>
      </div>
    </div>
  );
}
