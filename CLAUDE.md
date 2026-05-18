# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Fontz is a macOS desktop app (Wails v2 — Go backend + React/TS webview frontend) that browses Google Fonts, previews them live, and installs TTF files into `~/Library/Fonts/` so Font Book picks them up. macOS-only for v1.

## Commands

All commands run from the repo root unless noted.

```bash
wails dev              # Hot-reload dev mode. Also exposes a browser dev URL at http://localhost:34115
wails build            # Production .app at build/bin/fontz.app
wails generate module  # Regenerate TS bindings under frontend/wailsjs/ after changing Go method signatures or types
go build ./...         # Backend-only sanity check
```

Frontend-specific (run from `frontend/`):

```bash
npx tsc --noEmit       # Type-check only — fastest feedback when iterating on frontend
npm run build          # tsc + vite build (what wails build invokes internally)
```

There are no tests in this repo yet.

## Environment

`GOOGLE_FONTS_API_KEY` is read from `.env` at startup via `godotenv` in `internal/config/config.go`. If the key is missing, `App.startup` records the error string and `App.StartupError()` exposes it to the frontend — the rest of the methods return "app not initialized" until the key is set. `.env` is gitignored and is **not** embedded in production builds.

## Architecture

### Backend (Go module: `fontz`)

Three internal packages, all owned by `App` in `app.go`:

- `internal/config` — loads `.env`, computes macOS paths (`~/Library/Fonts/` and `~/Library/Application Support/fontz/`), ensures both dirs exist.
- `internal/gfonts` — `Client` does a single HTTP fetch of the full Google Fonts catalog (the API has no native pagination; one request returns ~1.9k families). `Catalog` wraps the client with a `sync.RWMutex`-guarded in-memory cache and implements filter/sort/paginate in Go. `sort=popularity` and `sort=trending` trigger a second one-shot fetch to build a `family → rank` map; those maps are memoized.
- `internal/installer` — downloads TTFs from the URLs in each family's `Files` map, writes them atomically (`.partial` → `os.Rename`) to `~/Library/Fonts/<FamilyNoSpaces>-<variant>.ttf`, and records each install in a sidecar manifest at `~/Library/Application Support/fontz/installed.json`. The manifest is the source of truth for "did we install this?" — used to gate overwrite prompts when the same filename already exists but wasn't put there by us. `Scan()` walks `~/Library/Fonts` and matches filenames to family names (permissive: strips spaces, case-insensitive).

`App` methods bound to the frontend (in `app.go`): `ListFonts`, `GetFamily`, `GetCategories`, `GetSubsets`, `RefreshCatalog`, `Install`, `ScanInstalled`, `StartupError`. Install progress is pushed via `runtime.EventsEmit(ctx, "install:progress", …)` — not a return value.

### Frontend (React + Vite + TS)

- `frontend/wailsjs/` is **generated** by `wails generate module`. Never hand-edit. If you change a Go method signature or any struct used in a bound method, regenerate.
- `frontend/src/lib/wails.ts` — typed wrappers around the generated bindings. `ProgressEvent` is defined locally there because Wails only generates TS for types referenced in method signatures; event payloads aren't.
- `frontend/src/lib/fontLoader.ts` — injects `@font-face` rules into `<head>` to preview fonts streamed from Google's CDN. Two entry points: `acquireFont`/`releaseFont` are ref-counted (used by `FontCard` so style tags clean up as virtualized rows unmount); `loadVariantOnce` is one-shot per `family+variant` (used by the variant preview dialog).
- `frontend/src/state/store.ts` — single Zustand store: filters, preview text/size, installed map, dialog state.
- `FontGrid` uses `react-virtuoso` and paginates by 60 rows ("Load more" button — infinite scroll fights the virtualizer's sentinel).

UI is intentionally TUI-styled: monospace (JetBrains Mono loaded via `<link>` in `index.html`), sharp corners enforced by `* { border-radius: 0 !important }` in `App.css`, black/white/orange palette via `:root` custom properties. The pixel-art FONTZ header lives **inside the sidebar**, not at the top of the window.

## Gotchas

- **Wails type generation**: types are only generated for structs that appear in a bound method's signature. `installer.ProgressEvent` is event-only and gets defined manually in `frontend/src/lib/wails.ts`.
- **Filename convention**: installed files are `<FamilyNoSpaces>-<variant>.ttf`, e.g. `OpenSans-700italic.ttf`. The variant token is the raw API key (`regular`, `700`, `700italic`) — `parseVariant` in `fontLoader.ts` is the one place that turns it into a display label.
- **Collision flow**: `Install` with `Overwrite: false` returns per-variant `status: "collision"` for files that exist but aren't in our manifest. Frontend then opens `CollisionDialog`, which retries with `Overwrite: true` if the user confirms.
- **Catalog cache is lazy and per-session**: the first `ListFonts` call triggers the fetch; `RefreshCatalog` invalidates. There is no disk cache.
- **API key in production builds**: `.env` is not embedded. Distributing the .app currently requires the user to provide a key. There is no BYOK flow yet.
