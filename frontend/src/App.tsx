import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { ApiKeyDialog } from './components/ApiKeyDialog';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { FontGrid } from './components/FontGrid';
import { CollisionDialog } from './components/CollisionDialog';
import { InstallDialog } from './components/InstallDialog';
import { InstallProgress } from './components/InstallProgress';
import { useStore } from './state/store';
import { api } from './lib/wails';

function App() {
  const setStartupError = useStore((s) => s.setStartupError);
  const startupError = useStore((s) => s.startupError);
  const [needsKey, setNeedsKey] = useState<boolean | null>(null);

  useEffect(() => {
    api.needsAPIKey().then(setNeedsKey).catch(() => setNeedsKey(false));
    api.startupError().then((msg) => {
      if (msg) setStartupError(msg);
    });
  }, [setStartupError]);

  const refresh = useCallback(async () => {
    await api.refreshCatalog();
    useStore.setState((s) => ({ filters: { ...s.filters } }));
  }, []);

  if (needsKey) {
    return <ApiKeyDialog onSaved={() => window.location.reload()} />;
  }

  return (
    <div id="app">
      {startupError && <div className="banner-error">{startupError}</div>}
      <div className="app-body">
        <Sidebar />
        <div className="app-main">
          <Toolbar onRefresh={refresh} />
          <FontGrid />
        </div>
      </div>
      <InstallDialog />
      <CollisionDialog />
      <InstallProgress />
    </div>
  );
}

export default App;
