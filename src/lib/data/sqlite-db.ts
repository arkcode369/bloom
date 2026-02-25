/**
 * SQLite Database Manager (Native Tauri version)
 * 
 * Handles SQLite database initialization and operations
 * using @tauri-apps/plugin-sql for native file system persistence.
 * Includes FTS5 support for fast full-text searching.
 */

import Database from '@tauri-apps/plugin-sql';

const DB_PATH = 'sqlite:bloom.db';
let db: Database | null = null;
let isInitialized = false;

// ============= Schema =============

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    title TEXT NOT NULL DEFAULT 'Untitled',
    content TEXT,
    cover_image TEXT,
    is_starred INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    name TEXT NOT NULL,
    color TEXT DEFAULT '#8B9A7C',
    icon TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS note_tags (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(note_id, tag_id)
  )`,
  `CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    source_note_id TEXT NOT NULL,
    target_note_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    display_name TEXT,
    avatar_style TEXT DEFAULT 'beam',
    avatar_colors TEXT DEFAULT '["#9DC08B","#B4A7D6","#F4A896","#FCD34D","#E8F5E9"]',
    bio TEXT,
    is_onboarded INTEGER DEFAULT 0,
    default_tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  )`,
  `CREATE TABLE IF NOT EXISTS edge_interactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    source_note_id TEXT NOT NULL,
    target_note_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS note_access_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    note_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    note_id UNINDEXED,
    title,
    content
  )`,
  // Triggers to keep FTS table in sync
  `CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(note_id, title, content) VALUES (new.id, new.title, new.content);
  END`,
  `CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    DELETE FROM notes_fts WHERE note_id = old.id;
  END`,
  `CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
    DELETE FROM notes_fts WHERE note_id = old.id;
    INSERT INTO notes_fts(note_id, title, content) VALUES (new.id, new.title, new.content);
  END`,
  `CREATE TABLE IF NOT EXISTS note_versions (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    title TEXT,
    content TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(is_archived)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_starred ON notes(is_starred)`,
  `CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id)`,
  `CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id)`,
  `CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_note_id)`,
  `CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_note_id)`,
  `CREATE INDEX IF NOT EXISTS idx_note_versions_note ON note_versions(note_id)`,
  // Daily Planning tables
  `CREATE TABLE IF NOT EXISTS daily_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    plan_date TEXT NOT NULL,
    review_notes TEXT,
    review_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, plan_date)
  )`,
  `CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    daily_plan_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_type TEXT NOT NULL DEFAULT 'custom',
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    note_ids TEXT DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (daily_plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS time_blocks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    daily_plan_id TEXT NOT NULL,
    target_id TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    block_type TEXT NOT NULL DEFAULT 'focus_work',
    title TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (daily_plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(plan_date)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_plans_user ON daily_plans(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_targets_plan ON targets(daily_plan_id)`,
  `CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status)`,
  `CREATE INDEX IF NOT EXISTS idx_time_blocks_plan ON time_blocks(daily_plan_id)`,
  `CREATE INDEX IF NOT EXISTS idx_time_blocks_target ON time_blocks(target_id)`,
  // Writing Stats for Activity Calendar
  `CREATE TABLE IF NOT EXISTS daily_writing_stats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    date TEXT NOT NULL,
    total_words INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_daily_writing_stats_date ON daily_writing_stats(date)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_writing_stats_user ON daily_writing_stats(user_id)`
];

// ============= Database Manager =============

export async function initDatabase(): Promise<Database> {
  if (isInitialized && db) {
    return db;
  }

  console.log('🚀 Initializing native SQLite database with FTS5...');
  db = await Database.load(DB_PATH);

  await db.execute('PRAGMA foreign_keys = ON');

  for (const sql of SCHEMA_SQL) {
    await db.execute(sql);
  }

  let currentVersion = 0;
  const versionResult = await db.select<{ version: number }[]>('SELECT version FROM schema_version LIMIT 1');
  if (versionResult.length > 0) {
    currentVersion = versionResult[0].version;
  } else {
    await db.execute('INSERT INTO schema_version (version) VALUES (?)', [1]);
    currentVersion = 1;
  }

  // Migration to Version 2: Ensure schema is correct without dropping data
  if (currentVersion < 2) {
    console.log('🔄 Migrating database to version 2...');

    // In a real enterprise app, we would use ALTER TABLE or a temp table strategy 
    // to preserve data while changing constraints. 
    // Here we ensure the new tables are created if they don't exist.
    for (const sql of SCHEMA_SQL) {
      await db.execute(sql);
    }

    await db.execute('UPDATE schema_version SET version = 2');
    console.log('✅ Migration to version 2 complete');
    currentVersion = 2;
  }

  if (currentVersion < 3) {
    console.log('🔄 Migrating database to version 3 (FTS5 optimization)...');

    // Safely recreate FTS triggers/table
    await db.execute('DROP TABLE IF EXISTS notes_fts');
    await db.execute(`CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      note_id UNINDEXED,
      title,
      content
    )`);

    // Repopulate FTS from existing notes
    await db.execute(`INSERT INTO notes_fts(note_id, title, content) SELECT id, title, content FROM notes`);

    await db.execute('UPDATE schema_version SET version = 3');
    console.log('✅ Migration to version 3 complete');
    currentVersion = 3;
  }

  if (currentVersion < 4) {
    console.log('🔄 Migrating database to version 4 (Version History)...');

    for (const sql of SCHEMA_SQL) {
      if (sql.includes('note_versions')) {
        await db.execute(sql);
      }
    }

    await db.execute('UPDATE schema_version SET version = 4');
    console.log('✅ Migration to version 4 complete');
    currentVersion = 4;
  }

  if (currentVersion < 5) {
    console.log('🔄 Migrating database to version 5 (Note Pinning)...');

    try {
      await db.execute('ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0');
    } catch {
      // Column may already exist
    }

    try {
      await db.execute('CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned)');
    } catch {
      // Index may already exist
    }

    await db.execute('UPDATE schema_version SET version = 5');
    console.log('✅ Migration to version 5 complete');
    currentVersion = 5;
  }

  if (currentVersion < 6) {
    console.log('🔄 Migrating database to version 6 (Daily Planning)...');

    // Check if planning tables already exist
    const tables = await db.select<Array<{ name: string }>>("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('daily_plans', 'targets', 'time_blocks')");
    const existingTables = tables.map(t => t.name);
    
    if (existingTables.length > 0) {
      console.log('📋 Found existing planning tables:', existingTables);
      
      // Check and add missing columns instead of dropping
      try {
        // Check daily_plans columns
        const dailyPlansColumns = await db.select<Array<{ name: string }>>(`PRAGMA table_info(daily_plans)`);
        const dailyPlansColumnNames = dailyPlansColumns.map(c => c.name);
        
        if (!dailyPlansColumnNames.includes('review_notes')) {
          await db.execute('ALTER TABLE daily_plans ADD COLUMN review_notes TEXT');
          console.log('✅ Added review_notes to daily_plans');
        }
        if (!dailyPlansColumnNames.includes('review_completed')) {
          await db.execute('ALTER TABLE daily_plans ADD COLUMN review_completed INTEGER NOT NULL DEFAULT 0');
          console.log('✅ Added review_completed to daily_plans');
        }
        
        // Check targets columns
        const targetsColumns = await db.select<Array<{ name: string }>>(`PRAGMA table_info(targets)`);
        const targetsColumnNames = targetsColumns.map(c => c.name);
        
        if (!targetsColumnNames.includes('estimated_minutes')) {
          await db.execute('ALTER TABLE targets ADD COLUMN estimated_minutes INTEGER');
          console.log('✅ Added estimated_minutes to targets');
        }
        if (!targetsColumnNames.includes('actual_minutes')) {
          await db.execute('ALTER TABLE targets ADD COLUMN actual_minutes INTEGER');
          console.log('✅ Added actual_minutes to targets');
        }
        if (!targetsColumnNames.includes('sort_order')) {
          await db.execute('ALTER TABLE targets ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
          console.log('✅ Added sort_order to targets');
        }
        
        // Check time_blocks columns
        const timeBlocksColumns = await db.select<Array<{ name: string }>>(`PRAGMA table_info(time_blocks)`);
        const timeBlocksColumnNames = timeBlocksColumns.map(c => c.name);
        
        if (!timeBlocksColumnNames.includes('color')) {
          await db.execute('ALTER TABLE time_blocks ADD COLUMN color TEXT NOT NULL DEFAULT "#3b82f6"');
          console.log('✅ Added color to time_blocks');
        }
        
      } catch (e) {
        console.log('⚠️ Could not alter tables, will recreate:', e);
        // Fallback: drop and recreate only if alter fails
        await db.execute('DROP TABLE IF EXISTS time_blocks');
        await db.execute('DROP TABLE IF EXISTS targets');
        await db.execute('DROP TABLE IF EXISTS daily_plans');
        console.log('✅ Dropped planning tables (fallback)');
      }
    }

    // Create tables only if they don't exist
    if (existingTables.length === 0) {
      console.log('🔧 Creating new planning tables...');
      const planningStatements = SCHEMA_SQL.filter(sql =>
        sql.includes('daily_plans') || sql.includes('targets') || sql.includes('time_blocks')
      );
      for (const sql of planningStatements) {
        await db.execute(sql);
        console.log('✅ Executed:', sql.split('CREATE TABLE')[1]?.split('(')[0]?.trim());
      }
    } else {
      console.log('✅ Planning tables already exist, only added missing columns');
    }

    await db.execute('UPDATE schema_version SET version = 6');
    console.log('✅ Migration to version 6 complete');
    currentVersion = 6;
  }

  if (currentVersion < 7) {
    console.log('🔄 Migrating database to version 7 (Writing Stats Calendar)...');

    const writingStatsStatements = SCHEMA_SQL.filter(sql =>
      sql.includes('daily_writing_stats')
    );
    for (const sql of writingStatsStatements) {
      await db.execute(sql);
      console.log('✅ Executed:', sql.split('CREATE TABLE')[1]?.split('(')[0]?.trim());
    }

    await db.execute('UPDATE schema_version SET version = 7');
    console.log('✅ Migration to version 7 complete');
    currentVersion = 7;
  }

  if (currentVersion < 8) {
    console.log('🔄 Migrating database to version 8 (Tag icons)...');
    try {
      await db.execute('ALTER TABLE tags ADD COLUMN icon TEXT DEFAULT NULL');
      console.log('✅ Added icon to tags');
    } catch {
      // Column may already exist
    }
    await db.execute('UPDATE schema_version SET version = 8');
    console.log('✅ Migration to version 8 complete');
    currentVersion = 8;
  }

  isInitialized = true;
  console.log('✅ Native SQLite database initialized');

  return db;
}

export async function saveDatabase(): Promise<void> {
  // No-op for native SQLite as it saves automatically to file system
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function clearDatabase(): Promise<void> {
  if (db) {
    await db.execute('DELETE FROM note_tags');
    await db.execute('DELETE FROM links');
    await db.execute('DELETE FROM edge_interactions');
    await db.execute('DELETE FROM note_access_log');
    await db.execute('DELETE FROM notes');
    await db.execute('DELETE FROM tags');
    await db.execute('DELETE FROM profiles');
  }
}

// ============= Utility Functions =============

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
