/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** GitHub PAT (read-only) injected at build time for private repo auto-update */
  readonly VITE_UPDATER_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
