import { useEffect, useRef, useState } from 'react';
import { onInstallProgress, type ProgressEvent } from '../lib/wails';

// Transient notification shown in the corner while a font installs; auto-dismisses on completed/failed.
type Toast = ProgressEvent & { id: number };

const MAX_TOASTS = 5;
const DISMISS_MS = 3500;

export function InstallProgress() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const unsubscribe = onInstallProgress((ev) => {
      const id = nextIdRef.current++;
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { ...ev, id }]);

      if (ev.status === 'completed' || ev.status === 'failed') {
        const timer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          timers.delete(timer);
        }, DISMISS_MS);
        timers.add(timer);
      }
    });

    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.status}`}>
          <strong>{t.family}</strong>
          <span> · {t.variant}</span>
          <span> · {t.status}</span>
          {t.error && <div className="toast-error">{t.error}</div>}
        </div>
      ))}
    </div>
  );
}
