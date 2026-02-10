# Bloom Project Structure

This document outlines the architecture and organization of the Bloom desktop application. Bloom is a local-only, networked thought note-taking app built with Tauri, React, and SQLite.

## Core Directory Structure

```text
bloom-site/
├── src-tauri/              # Native Rust backend (Tauri)
│   ├── src/                # Rust source code (system tray, window management)
│   └── tauri.conf.json     # Tauri configuration (permissions, plugins)
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks (logic & state management)
│   ├── i18n/               # Internationalization (multi-language support)
│   ├── lib/                # Shared utilities and core data layer
│   ├── pages/              # Top-level page components (routes)
│   ├── test/               # Test configuration and example tests
│   ├── App.tsx             # Main application component & routing
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles and Tailwind CSS
├── public/                 # Static assets (icons, etc.)
└── package.json            # Frontend dependencies and scripts
```

## Detailed File Breakdown

### `src/lib/data/` (The Data Engine)
The heart of the local-only architecture.
- `sqlite-db.ts`: Manages the native SQLite connection, schema definitions, and migrations (FTS5 search support).
- `sqlite-adapter.ts`: Implements the `DataAdapter` interface using `@tauri-apps/plugin-sql`. Handles all CRUD operations.
- `DataProvider.tsx`: React Context provider that makes the data adapter available throughout the app.
- `types.ts`: Core TypeScript interfaces for Notes, Tags, Links, and Profiles.
- `assets.ts`: Manages local file storage (images/attachments) using the Tauri filesystem plugin.

### `src/components/` (UI Components)
Organized by feature area.
- `editor/`: Rich-text editor implementation based on BlockNote.
- `graph/`: Interactive 3D graph visualization of note connections.
- `notes/`: Components for note listing, previewing, and metadata.
- `tags/`: Tag management and filtering UI.
- `command/`: Command palette and quick capture modals.
- `settings/`: Workspace settings, appearance, and profile editor.
- `layout/`: App-wide structural components like the Sidebar.
- `ui/`: Low-level design system components (buttons, dialogs, inputs) powered by shadcn/ui.

### `src/hooks/` (Logic & State)
- `useNotes.ts` / `useTags.ts`: React Query hooks for efficient data fetching and caching.
- `useAuth.tsx`: Manages the "local session" and onboarding state.
- `useGraphInteractions.ts`: Tracks Hebbian learning (fire together, wire together) based on user activity.
- `useWritingStats.ts`: Tracks local writing progress and daily goals.
- `usePreferences.tsx`: Manages user settings (font size, theme) via `localStorage`.

### `src/pages/`
- `Index.tsx`: The main workspace layout where you spend 99% of your time.
- `Welcome.tsx`: The first-run onboarding wizard for creating a new local workspace.
- `NotFound.tsx`: Fallback for invalid routes.

### `src/lib/` (Utilities)
- `utils.ts`: Tailwind CSS class merging utility (`cn`).
- `graphInteractions.ts`: Core logic for calculating edge strengths in the knowledge graph.

## Design Philosophy

1. **Local-Only**: No external APIs or cloud services. Everything resides in `bloom.db` on the user's machine.
2. **Networked Thought**: Heavy focus on `[[wikilinks]]` and graph visualization.
3. **Clean Code**: separation of concerns between data fetching (hooks), data persistence (adapters), and presentation (components).
