```
███████╗ ██████╗ ███╗   ██╗████████╗███████╗
██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝╚══███╔╝
█████╗  ██║   ██║██╔██╗ ██║   ██║     ███╔╝
██╔══╝  ██║   ██║██║╚██╗██║   ██║    ███╔╝
██║     ╚██████╔╝██║ ╚████║   ██║   ███████╗
╚═╝      ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝
```

A desktop browser for Google Fonts with live previews and one-click install into the system font directory. Filter the catalog, preview families with your own sample text, pick the variants you want, and the TTFs land in `~/Library/Fonts/` where Font Book and every other macOS app picks them up automatically. No browser, no zip files, no manual drag-and-drop.

## Features

- Browse the full Google Fonts catalog (~1,900 families) in a virtualized grid
- Live previews with adjustable sample text and font size
- Filter by category (serif, sans-serif, display, handwriting, monospace) and subset (latin, cyrillic, greek, ...)
- Sort by alphabetical, popularity, or trending
- Per-variant install — pick exactly the weights/italics you want
- Auto-detects already-installed fonts on startup
- Collision detection — warns before overwriting fonts you put there yourself
- Atomic downloads — `.partial → rename` so half-written files never appear in the font directory
- TUI-styled UI: monospace, sharp corners, black / white / orange palette

## Requirements

- macOS (v1 is macOS-only — fonts are installed to `~/Library/Fonts/`)
- Go 1.21+
- Node 18+
- [Wails v2 CLI](https://wails.io/docs/gettingstarted/installation)
- A [Google Fonts API key](https://developers.google.com/fonts/docs/developer_api)

## Quick start

Add your API key:

```bash
echo 'GOOGLE_FONTS_API_KEY=your_key_here' > .env
```

Run in dev mode (hot reload, browser dev URL at http://localhost:34115):

```bash
make run
```

Build a production `.app`:

```bash
make build
# → build/bin/fontz.app
```

Lint the Go code:

```bash
make lint
```

## Manual setup

```bash
go mod download
cd frontend && npm install && cd ..
wails dev
```

## Catalog reference

Filters and sort options are applied server-side (Go) against an in-memory cache of the Google Fonts API.

| Filter / Sort | Values | Description |
| --- | --- | --- |
| search | free text | Substring match against family name (case-insensitive) |
| category | `serif`, `sans-serif`, `display`, `handwriting`, `monospace` | Google Fonts category |
| subset | `latin`, `cyrillic`, `greek`, `vietnamese`, ... | Character subset families support |
| sort | `alpha` | Alphabetical by family name |
| sort | `popularity` | Triggers a second one-shot fetch to build a rank map (memoized) |
| sort | `trending` | Same as popularity but against the trending endpoint |

The catalog is fetched lazily on first `ListFonts` call and cached in memory for the session. Use the refresh button (or `RefreshCatalog` binding) to invalidate. There is no disk cache.

## Architecture

Two halves talk over Wails-generated bindings:

- **Backend (Go)** — owns the catalog fetch, filter/sort/paginate, TTF download, atomic file writes, and the install manifest.
- **Frontend (React + Vite + TS)** — owns the UI, virtualized list, preview rendering (injects `@font-face` rules into the document head), filters, and dialogs.

Install progress is pushed from the backend over a Wails event channel (`install:progress`) rather than returned synchronously, so the UI can show per-variant toasts while a batch install runs.

## Key modules

```
fontz/
├── app.go                     # Wails App — wires config, catalog, installer
├── internal/
│   ├── config/                # .env loading, macOS paths, MkdirAll
│   ├── gfonts/                # Google Fonts API client + in-memory catalog
│   └── installer/
│       ├── installer.go       # Download flow, atomic .partial → rename
│       └── manifest.go        # Sidecar ledger of installed fonts
└── frontend/src/
    ├── state/store.ts         # Zustand store — filters, preview, dialogs
    ├── lib/
    │   ├── wails.ts           # Typed wrappers around generated bindings
    │   └── fontLoader.ts      # Ref-counted @font-face injection
    └── components/
        ├── FontGrid.tsx       # react-virtuoso grid, paginates by 60
        ├── FontCard.tsx       # Per-family preview row
        ├── VariantPicker.tsx  # Pick weights/italics before install
        ├── CollisionDialog.tsx# Confirm overwrite for non-Fontz files
        ├── InstallProgress.tsx# Toast feed for install events
        ├── Toolbar.tsx        # Search, sample text, sample size
        └── Sidebar.tsx        # Category + subset filters, refresh
```

## Install flow

1. User clicks a font card → `VariantPicker` opens with checkboxes for each available variant.
2. Frontend calls `Install({ family, variants, overwrite: false })`.
3. Backend downloads each variant to `~/Library/Fonts/<FamilyNoSpaces>-<variant>.ttf.partial`, then renames into place.
4. Each install is recorded in the sidecar manifest at `~/Library/Application Support/fontz/installed.json`.
5. If a target filename already exists **and** is not in the manifest, the variant returns `status: "collision"` — the frontend opens `CollisionDialog`, and on confirmation retries with `overwrite: true`.

## Gotchas

- **Regenerate TS bindings** after changing any Go method signature or struct used in a binding: `wails generate module`. The `frontend/wailsjs/` directory is generated — never hand-edit.
- **Event payload types** (e.g. `ProgressEvent`) are not generated by Wails — they're declared manually in `frontend/src/lib/wails.ts`.
- **API key in production builds** — `.env` is not embedded. Distributing the `.app` currently requires the user to provide their own key. There is no in-app BYOK flow yet.
- **Filename convention** — installed files are `<FamilyNoSpaces>-<variant>.ttf`, e.g. `OpenSans-700italic.ttf`. The variant token is the raw Google Fonts API key.

## Tips

- macOS picks up new fonts in `~/Library/Fonts/` instantly — Font Book and most apps will see them without restart.
- The manifest at `~/Library/Application Support/fontz/installed.json` is plain JSON — safe to inspect or hand-edit if you need to forget about a font Fontz installed.
- Running `wails dev` also exposes a browser dev URL at http://localhost:34115 if you prefer Chrome devtools to the embedded WebKit inspector.

## License

MIT
