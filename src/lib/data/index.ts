/**
 * Data Layer Module
 * 
 * This module provides an abstraction layer for data operations
 * using SQLite (desktop deployment via Tauri).
 * 
 * Usage:
 * 
 * 1. Wrap your app with DataProvider:
 *    <DataProvider>
 *      <App />
 *    </DataProvider>
 * 
 * 2. Use the adapter in components:
 *    const adapter = useDataAdapter();
 *    const notes = await adapter.notes.getAll();
 */

// Types
export type {
  // Entities
  Note,
  Tag,
  NoteTag,
  Link,
  Profile,
  User,
  AvatarStyle,

  // Inputs
  CreateNoteInput,
  UpdateNoteInput,
  CreateTagInput,
  UpdateTagInput,
  ProfileUpdate,

  // Query Results
  TagWithCount,
  NoteTagWithTag,
  BacklinkWithNote,
  NoteLinks,

  // Auth
  AuthResult,
  Session,

  // Adapter
  DataAdapter,
  DataAdapterType,
} from './types';

export { detectEnvironment } from './types';

// Adapters
export { createSQLiteAdapter } from '@/lib/data/sqlite-adapter';

// Database utilities
export { initDatabase, clearDatabase, saveDatabase } from './sqlite-db';

// Provider & Hooks
export {
  DataProvider,
  useDataAdapter,
  useDataEnvironment,
  useDataContext
} from './DataProvider';

export {
  WritingStatsProvider,
  useWritingStatsContext
} from './WritingStatsProvider';
