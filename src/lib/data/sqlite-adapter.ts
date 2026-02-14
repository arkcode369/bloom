import type {
  DataAdapter,
  Note,
  Tag,
  NoteTag,
  Link,
  NoteVersion,
  Profile,
  User,
  Session,
  CreateNoteInput,
  UpdateNoteInput,
  CreateTagInput,
  UpdateTagInput,
  ProfileUpdate,
  TagWithCount,
  NoteTagWithTag,
  BacklinkWithNote,
  NoteLinks,
  AuthResult,
  AvatarStyle,
  DailyPlan,
  Target,
  TimeBlock,
  CreateDailyPlanInput,
  UpdateDailyPlanInput,
  CreateTargetInput,
  UpdateTargetInput,
  CreateTimeBlockInput,
  UpdateTimeBlockInput,
  DailyPlanWithDetails,
  TargetStatus,
  TargetPriority,
  TargetType,
  TimeBlockType,
} from './types';
import type {
  NoteRow,
  TagRow,
  TagWithCountRow,
  NoteTagJoinRow,
  LinkRow,
  BacklinkJoinRow,
  NoteVersionRow,
  ProfileRow,
  EdgeStrengthRow,
  NoteTagExistingRow,
  ExistingLinkRow,
  VersionTimestampRow,
  VersionRestoreRow,
  DailyPlanRow,
  TargetRow,
  TimeBlockRow,
} from './sqlite-row-types';
import {
  initDatabase,
  getDatabase,
  generateUUID,
  getCurrentTimestamp,
} from './sqlite-db';

const DEFAULT_COLORS = ['#9DC08B', '#B4A7D6', '#F4A896', '#FCD34D', '#E8F5E9'];
const DEFAULT_TAG_COLOR = '#8B9A7C';

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mapRowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    cover_image: row.cover_image,
    is_starred: Boolean(row.is_starred),
    is_archived: Boolean(row.is_archived),
    is_pinned: Boolean(row.is_pinned),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    color: row.color,
    created_at: row.created_at,
  };
}

function mapRowToLink(row: LinkRow): Link {
  return {
    id: row.id,
    source_note_id: row.source_note_id,
    target_note_id: row.target_note_id,
    user_id: row.user_id,
    created_at: row.created_at,
  };
}

function mapRowToDailyPlan(row: DailyPlanRow): DailyPlan {
  return {
    id: row.id,
    user_id: row.user_id,
    plan_date: row.plan_date,
    review_notes: row.review_notes,
    review_completed: Boolean(row.review_completed),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRowToTarget(row: TargetRow): Target {
  let noteIds: string[] = [];
  try { noteIds = JSON.parse(row.note_ids || '[]'); } catch { /* empty */ }
  return {
    id: row.id,
    user_id: row.user_id,
    daily_plan_id: row.daily_plan_id,
    title: row.title,
    description: row.description,
    target_type: row.target_type as TargetType,
    estimated_minutes: row.estimated_minutes,
    actual_minutes: row.actual_minutes,
    status: row.status as TargetStatus,
    priority: row.priority as TargetPriority,
    note_ids: noteIds,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRowToTimeBlock(row: TimeBlockRow): TimeBlock {
  return {
    id: row.id,
    user_id: row.user_id,
    daily_plan_id: row.daily_plan_id,
    target_id: row.target_id,
    start_time: row.start_time,
    end_time: row.end_time,
    block_type: row.block_type as TimeBlockType,
    title: row.title,
    color: row.color,
    created_at: row.created_at,
  };
}

const NOTE_COLUMNS = 'id, user_id, title, content, cover_image, is_starred, is_archived, is_pinned, created_at, updated_at';

export function createSQLiteAdapter(): DataAdapter {
  let currentUser: User | null = { id: 'local-user', email: 'workspace@local' };
  let authChangeCallbacks: ((user: User | null) => void)[] = [];
  let dbInitialized = false;

  const ensureDb = async () => {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }
    return getDatabase();
  };

  const ensureUserId = (): string => {
    return 'local-user';
  };

  const notifyAuthChange = (user: User | null) => {
    authChangeCallbacks.forEach(cb => cb(user));
  };

  return {
    auth: {
      async getCurrentUser(): Promise<User | null> {
        return currentUser;
      },

      async deleteAccount(): Promise<AuthResult> {
        try {
          const db = await ensureDb();
          await db.execute('BEGIN TRANSACTION');
          try {
            await db.execute('DELETE FROM note_tags');
            await db.execute('DELETE FROM links');
            await db.execute('DELETE FROM edge_interactions');
            await db.execute('DELETE FROM note_access_log');
            await db.execute('DELETE FROM notes');
            await db.execute('DELETE FROM tags');
            await db.execute('DELETE FROM profiles');
            await db.execute('COMMIT');
            return { error: null };
          } catch (innerErr) {
            await db.execute('ROLLBACK');
            throw innerErr;
          }
        } catch (err) {
          console.error('Delete account failed:', err);
          return { error: err as Error };
        }
      },

      onAuthStateChange(callback: (user: User | null) => void): () => void {
        authChangeCallbacks.push(callback);
        callback(currentUser);
        return () => {
          authChangeCallbacks = authChangeCallbacks.filter(cb => cb !== callback);
        };
      },
    },

    notes: {
      async getAll(): Promise<Note[]> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const result = await db.select<NoteRow[]>(
          `SELECT ${NOTE_COLUMNS} 
           FROM notes WHERE user_id = ? AND is_archived = 0 
           ORDER BY is_pinned DESC, updated_at DESC`,
          [userId]
        );

        return result.map(mapRowToNote);
      },

      async getById(id: string): Promise<Note | null> {
        const db = await ensureDb();

        const result = await db.select<NoteRow[]>(
          `SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ?`,
          [id]
        );

        if (result.length === 0) return null;
        return mapRowToNote(result[0]);
      },

      async getStarred(): Promise<Note[]> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const result = await db.select<NoteRow[]>(
          `SELECT ${NOTE_COLUMNS} 
           FROM notes WHERE user_id = ? AND is_starred = 1 AND is_archived = 0 
           ORDER BY is_pinned DESC, updated_at DESC`,
          [userId]
        );

        return result.map(mapRowToNote);
      },

      async getArchived(): Promise<Note[]> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const result = await db.select<NoteRow[]>(
          `SELECT ${NOTE_COLUMNS} 
           FROM notes WHERE user_id = ? AND is_archived = 1 
           ORDER BY updated_at DESC`,
          [userId]
        );

        return result.map(mapRowToNote);
      },

      async getPinned(): Promise<Note[]> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const result = await db.select<NoteRow[]>(
          `SELECT ${NOTE_COLUMNS} 
           FROM notes WHERE user_id = ? AND is_pinned = 1 AND is_archived = 0 
           ORDER BY updated_at DESC`,
          [userId]
        );

        return result.map(mapRowToNote);
      },

      async search(query: string): Promise<Note[]> {
        if (!query.trim()) return [];

        const userId = ensureUserId();
        const db = await ensureDb();

        const sanitizedQuery = '"' + query.replace(/"/g, '""') + '"';

        const result = await db.select<NoteRow[]>(
          `SELECT n.id, n.user_id, n.title, n.content, n.cover_image, n.is_starred, n.is_archived, n.is_pinned, n.created_at, n.updated_at
           FROM notes n
           JOIN notes_fts f ON n.id = f.note_id
           WHERE n.user_id = ? AND n.is_archived = 0 
           AND notes_fts MATCH ?
           ORDER BY rank
           LIMIT 20`,
          [userId, sanitizedQuery]
        );

        if (result.length === 0) {
          const searchTerm = `%${query}%`;
          const fallback = await db.select<NoteRow[]>(
            `SELECT ${NOTE_COLUMNS} 
             FROM notes 
             WHERE user_id = ? AND is_archived = 0 
             AND (title LIKE ? OR content LIKE ?)
             ORDER BY updated_at DESC
             LIMIT 20`,
            [userId, searchTerm, searchTerm]
          );
          return fallback.map(mapRowToNote);
        }

        return result.map(mapRowToNote);
      },

      async create(input: CreateNoteInput, defaultTagIds?: string[], id?: string): Promise<Note> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const finalId = id || generateUUID();
        const now = getCurrentTimestamp();

        await db.execute(
          `INSERT INTO notes (id, user_id, title, content, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [finalId, userId, input.title || 'Untitled', input.content || '', now, now]
        );

        if (defaultTagIds && defaultTagIds.length > 0) {
          for (const tagId of defaultTagIds) {
            const noteTagId = generateUUID();
            await db.execute(
              'INSERT INTO note_tags (id, note_id, tag_id) VALUES (?, ?, ?)',
              [noteTagId, finalId, tagId]
            );
          }
        }

        return {
          id: finalId,
          user_id: userId,
          title: input.title || 'Untitled',
          content: input.content || '',
          cover_image: null,
          is_starred: false,
          is_archived: false,
          is_pinned: false,
          created_at: now,
          updated_at: now,
        };
      },

      async update(id: string, input: UpdateNoteInput): Promise<Note> {
        const db = await ensureDb();
        const now = getCurrentTimestamp();

        const current = await this.getById(id);
        if (!current) throw new Error('Note not found');

        const updates: string[] = ['updated_at = ?'];
        const values: (string | number | null)[] = [now];

        if (input.title !== undefined) {
          updates.push('title = ?');
          values.push(input.title);
        }
        if (input.content !== undefined) {
          updates.push('content = ?');
          values.push(input.content);
        }
        if (input.cover_image !== undefined) {
          updates.push('cover_image = ?');
          values.push(input.cover_image);
        }
        if (input.is_starred !== undefined) {
          updates.push('is_starred = ?');
          values.push(input.is_starred ? 1 : 0);
        }
        if (input.is_archived !== undefined) {
          updates.push('is_archived = ?');
          values.push(input.is_archived ? 1 : 0);
        }
        if (input.is_pinned !== undefined) {
          updates.push('is_pinned = ?');
          values.push(input.is_pinned ? 1 : 0);
        }

        values.push(id);

        await db.execute(
          `UPDATE notes SET ${updates.join(', ')} WHERE id = ?`,
          values
        );

        if (input.title !== undefined || input.content !== undefined) {
          try {
            const lastVersions = await db.select<VersionTimestampRow[]>(
              'SELECT created_at FROM note_versions WHERE note_id = ? ORDER BY created_at DESC LIMIT 1',
              [id]
            );

            let shouldSaveVersion = true;
            if (lastVersions.length > 0) {
              const lastVersionTime = new Date(lastVersions[0].created_at).getTime();
              const nowTime = new Date(now).getTime();
              if (nowTime - lastVersionTime < 5 * 60 * 1000) {
                shouldSaveVersion = false;
              }
            }

            if (shouldSaveVersion) {
              const versionId = generateUUID();
              await db.execute(
                'INSERT INTO note_versions (id, note_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)',
                [versionId, id, input.title ?? current.title, input.content ?? current.content, now]
              );
            }
          } catch (vErr) {
            console.warn('Failed to save note version:', vErr);
          }
        }

        return {
          ...current,
          ...input,
          updated_at: now,
        };
      },

      async delete(id: string): Promise<void> {
        const db = await ensureDb();
        await db.execute('DELETE FROM notes WHERE id = ?', [id]);
      },

      async toggleStar(id: string, isStarred: boolean): Promise<Note> {
        return this.update(id, { is_starred: isStarred });
      },

      async togglePin(id: string, isPinned: boolean): Promise<Note> {
        return this.update(id, { is_pinned: isPinned });
      },

      async archive(id: string): Promise<Note> {
        return this.update(id, { is_archived: true });
      },

      async unarchive(id: string): Promise<Note> {
        return this.update(id, { is_archived: false });
      },

      async getVersions(noteId: string): Promise<NoteVersion[]> {
        const db = await ensureDb();
        const result = await db.select<NoteVersionRow[]>(
          'SELECT id, note_id, title, content, created_at FROM note_versions WHERE note_id = ? ORDER BY created_at DESC',
          [noteId]
        );
        return result.map(row => ({
          id: row.id,
          note_id: row.note_id,
          title: row.title || '',
          content: row.content,
          created_at: row.created_at,
        }));
      },

      async restoreVersion(versionId: string): Promise<Note> {
        const db = await ensureDb();
        const versions = await db.select<VersionRestoreRow[]>(
          'SELECT note_id, title, content FROM note_versions WHERE id = ?',
          [versionId]
        );
        if (versions.length === 0) throw new Error('Version not found');
        const v = versions[0];
        return this.update(v.note_id, { title: v.title, content: v.content });
      },
    },

    tags: {
      async getAll(): Promise<Tag[]> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const result = await db.select<TagRow[]>(
          `SELECT id, user_id, name, color, created_at 
           FROM tags WHERE user_id = ? 
           ORDER BY name ASC`,
          [userId]
        );

        return result.map(mapRowToTag);
      },

      async getAllWithCounts(): Promise<TagWithCount[]> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const result = await db.select<TagWithCountRow[]>(
          `SELECT t.id, t.user_id, t.name, t.color, t.created_at, 
                  COUNT(n.id) as note_count
           FROM tags t
           LEFT JOIN note_tags nt ON t.id = nt.tag_id
           LEFT JOIN notes n ON nt.note_id = n.id AND n.is_archived = 0
           WHERE t.user_id = ?
           GROUP BY t.id
           ORDER BY t.name ASC`,
          [userId]
        );

        return result.map(row => ({
          ...mapRowToTag(row),
          noteCount: row.note_count,
        }));
      },

      async create(input: CreateTagInput): Promise<Tag> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const id = generateUUID();
        const now = getCurrentTimestamp();

        await db.execute(
          'INSERT INTO tags (id, user_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)',
          [id, userId, input.name, input.color || DEFAULT_TAG_COLOR, now]
        );

        return {
          id,
          user_id: userId,
          name: input.name,
          color: input.color || DEFAULT_TAG_COLOR,
          created_at: now,
        };
      },

      async update(id: string, input: UpdateTagInput): Promise<Tag> {
        const db = await ensureDb();

        const updates: string[] = [];
        const values: (string | number)[] = [];

        if (input.name !== undefined) {
          updates.push('name = ?');
          values.push(input.name);
        }
        if (input.color !== undefined) {
          updates.push('color = ?');
          values.push(input.color);
        }

        if (updates.length > 0) {
          values.push(id);
          await db.execute(
            `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`,
            values
          );
        }

        const result = await db.select<TagRow[]>(
          'SELECT id, user_id, name, color, created_at FROM tags WHERE id = ?',
          [id]
        );

        if (result.length === 0) {
          throw new Error('Tag not found');
        }

        return mapRowToTag(result[0]);
      },

      async delete(id: string): Promise<void> {
        const db = await ensureDb();
        await db.execute('DELETE FROM tags WHERE id = ?', [id]);
      },
    },

    noteTags: {
      async getByNoteId(noteId: string): Promise<NoteTagWithTag[]> {
        const db = await ensureDb();

        const result = await db.select<NoteTagJoinRow[]>(
          `SELECT nt.id, nt.note_id, nt.tag_id, nt.created_at,
                  t.id as t_id, t.user_id as t_user_id, t.name, t.color, t.created_at as t_created_at
           FROM note_tags nt
           JOIN tags t ON nt.tag_id = t.id
           WHERE nt.note_id = ?`,
          [noteId]
        );

        return result.map(row => ({
          id: row.id,
          note_id: row.note_id,
          tag_id: row.tag_id,
          created_at: row.created_at,
          tag: {
            id: row.t_id,
            user_id: row.t_user_id || 'local-user',
            name: row.name,
            color: row.color,
            created_at: row.t_created_at || '',
          },
        }));
      },

      async getNotesByTagId(tagId: string): Promise<Note[]> {
        const db = await ensureDb();

        const result = await db.select<NoteRow[]>(
          `SELECT n.id, n.user_id, n.title, n.content, n.cover_image, n.is_starred, n.is_archived, n.is_pinned, n.created_at, n.updated_at
           FROM notes n
           JOIN note_tags nt ON n.id = nt.note_id
           WHERE nt.tag_id = ? AND n.is_archived = 0`,
          [tagId]
        );

        return result.map(mapRowToNote);
      },

      async addTagToNote(noteId: string, tagId: string): Promise<NoteTag> {
        const db = await ensureDb();

        const existing = await db.select<NoteTagExistingRow[]>(
          'SELECT id, created_at FROM note_tags WHERE note_id = ? AND tag_id = ?',
          [noteId, tagId]
        );

        if (existing.length > 0) {
          return {
            id: existing[0].id,
            note_id: noteId,
            tag_id: tagId,
            created_at: existing[0].created_at || getCurrentTimestamp(),
          };
        }

        const id = generateUUID();
        const now = getCurrentTimestamp();

        await db.execute(
          'INSERT INTO note_tags (id, note_id, tag_id, created_at) VALUES (?, ?, ?, ?)',
          [id, noteId, tagId, now]
        );

        return {
          id,
          note_id: noteId,
          tag_id: tagId,
          created_at: now,
        };
      },

      async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
        const db = await ensureDb();
        await db.execute(
          'DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?',
          [noteId, tagId]
        );
      },
    },

    links: {
      async getByNoteId(noteId: string): Promise<NoteLinks> {
        const db = await ensureDb();

        const outgoingResult = await db.select<LinkRow[]>(
          'SELECT id, source_note_id, target_note_id, user_id, created_at FROM links WHERE source_note_id = ?',
          [noteId]
        );

        const incomingResult = await db.select<LinkRow[]>(
          'SELECT id, source_note_id, target_note_id, user_id, created_at FROM links WHERE target_note_id = ?',
          [noteId]
        );

        return {
          outgoing: outgoingResult.map(mapRowToLink),
          incoming: incomingResult.map(mapRowToLink),
        };
      },

      async getBacklinks(noteId: string): Promise<BacklinkWithNote[]> {
        const db = await ensureDb();

        const targetResult = await db.select<{ title: string }[]>(
          'SELECT title FROM notes WHERE id = ?',
          [noteId]
        );

        if (targetResult.length === 0) {
          return [];
        }

        const targetTitle = targetResult[0].title;

        const result = await db.select<BacklinkJoinRow[]>(
          `SELECT l.id, l.source_note_id, l.target_note_id, l.user_id, l.created_at,
                  n.id as n_id, n.user_id as n_user_id, n.title, n.content, n.cover_image, 
                  n.is_starred, n.is_archived, n.is_pinned, n.created_at as n_created_at, n.updated_at
           FROM links l
           JOIN notes n ON l.source_note_id = n.id
           WHERE l.target_note_id = ?`,
          [noteId]
        );

        return result.map(row => {
          const content = row.content || '';
          const wikiLinkPattern = new RegExp(`\\[\\[${escapeRegex(targetTitle)}\\]\\]`, 'gi');
          const match = wikiLinkPattern.exec(content);
          let context = '';

          if (match) {
            const start = Math.max(0, match.index - 50);
            const end = Math.min(content.length, match.index + match[0].length + 50);
            context = (start > 0 ? '...' : '') +
              content.slice(start, end) +
              (end < content.length ? '...' : '');
          }

          return {
            link: {
              id: row.id,
              source_note_id: row.source_note_id,
              target_note_id: row.target_note_id,
              user_id: row.user_id,
              created_at: row.created_at,
            },
            sourceNote: {
              id: row.n_id,
              user_id: row.n_user_id,
              title: row.title,
              content: row.content,
              cover_image: row.cover_image,
              is_starred: Boolean(row.is_starred),
              is_archived: Boolean(row.is_archived),
              is_pinned: Boolean(row.is_pinned),
              created_at: row.n_created_at,
              updated_at: row.updated_at,
            },
            context,
          };
        });
      },

      async syncLinks(noteId: string, content: string, allNotes: Note[]): Promise<{ added: number; removed: number }> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        const foundTitles = new Set<string>();
        let match;

        while ((match = wikiLinkRegex.exec(content)) !== null) {
          foundTitles.add(match[1].toLowerCase());
        }

        const targetNotes = allNotes.filter(n =>
          foundTitles.has(n.title.toLowerCase()) && n.id !== noteId
        );

        const existingLinks = await db.select<ExistingLinkRow[]>(
          'SELECT id, target_note_id FROM links WHERE source_note_id = ?',
          [noteId]
        );

        const existingTargetIds = new Set(existingLinks.map(l => l.target_note_id));
        const newTargetIds = new Set(targetNotes.map(n => n.id));

        const toAdd = targetNotes.filter(n => !existingTargetIds.has(n.id));
        const toRemove = existingLinks.filter(l => !newTargetIds.has(l.target_note_id));

        if (toAdd.length === 0 && toRemove.length === 0) {
          return { added: 0, removed: 0 };
        }

        await db.execute('BEGIN TRANSACTION');
        try {
          for (const note of toAdd) {
            const id = generateUUID();
            const now = getCurrentTimestamp();
            await db.execute(
              'INSERT INTO links (id, source_note_id, target_note_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
              [id, noteId, note.id, userId, now]
            );
          }

          for (const link of toRemove) {
            await db.execute('DELETE FROM links WHERE id = ?', [link.id]);
          }

          await db.execute('COMMIT');
        } catch (err) {
          await db.execute('ROLLBACK');
          console.error('Failed to sync links:', err);
          throw err;
        }

        return { added: toAdd.length, removed: toRemove.length };
      },

      async createNoteFromLink(title: string, sourceNoteId: string): Promise<Note> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const noteId = generateUUID();
        const linkId = generateUUID();
        const now = getCurrentTimestamp();

        await db.execute('BEGIN TRANSACTION');
        try {
          await db.execute(
            `INSERT INTO notes (id, user_id, title, content, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [noteId, userId, title, `# ${title}\n\n`, now, now]
          );

          await db.execute(
            'INSERT INTO links (id, source_note_id, target_note_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
            [linkId, sourceNoteId, noteId, userId, now]
          );

          await db.execute('COMMIT');
        } catch (err) {
          await db.execute('ROLLBACK');
          console.error('Failed to create note from link:', err);
          throw err;
        }

        return {
          id: noteId,
          user_id: userId,
          title,
          content: `# ${title}\n\n`,
          cover_image: null,
          is_starred: false,
          is_archived: false,
          is_pinned: false,
          created_at: now,
          updated_at: now,
        };
      },
    },

    profile: {
      async get(): Promise<Profile | null> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const result = await db.select<ProfileRow[]>(
          `SELECT id, user_id, display_name, avatar_style, avatar_colors, bio, 
                  is_onboarded, default_tags, created_at, updated_at
           FROM profiles WHERE user_id = ?`,
          [userId]
        );

        if (result.length === 0) {
          const id = generateUUID();
          const now = getCurrentTimestamp();

          await db.execute(
            `INSERT INTO profiles (id, user_id, avatar_style, avatar_colors, default_tags, created_at, updated_at) 
             VALUES (?, ?, 'beam', ?, '[]', ?, ?)`,
            [id, userId, JSON.stringify(DEFAULT_COLORS), now, now]
          );

          return {
            id,
            user_id: userId,
            display_name: null,
            avatar_style: 'beam' as AvatarStyle,
            avatar_colors: DEFAULT_COLORS,
            bio: null,
            is_onboarded: false,
            default_tags: [],
            created_at: now,
            updated_at: now,
          };
        }

        const row = result[0];

        let avatarColors = DEFAULT_COLORS;
        try {
          avatarColors = JSON.parse(row.avatar_colors || '[]');
        } catch {
          console.warn('Failed to parse avatar_colors, using defaults');
        }

        let defaultTags: string[] = [];
        try {
          defaultTags = JSON.parse(row.default_tags || '[]');
        } catch {
          console.warn('Failed to parse default_tags, using empty array');
        }

        return {
          id: row.id,
          user_id: row.user_id,
          display_name: row.display_name,
          avatar_style: row.avatar_style as AvatarStyle,
          avatar_colors: avatarColors,
          bio: row.bio,
          is_onboarded: Boolean(row.is_onboarded),
          default_tags: defaultTags,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      },

      async update(updates: ProfileUpdate): Promise<Profile> {
        const userId = ensureUserId();
        const db = await ensureDb();
        const now = getCurrentTimestamp();

        const current = await this.get();
        if (!current) throw new Error('Profile not found');

        const updateParts: string[] = ['updated_at = ?'];
        const values: (string | number)[] = [now];

        if (updates.display_name !== undefined) {
          updateParts.push('display_name = ?');
          values.push(updates.display_name || '');
        }
        if (updates.avatar_style !== undefined) {
          updateParts.push('avatar_style = ?');
          values.push(updates.avatar_style);
        }
        if (updates.avatar_colors !== undefined) {
          updateParts.push('avatar_colors = ?');
          values.push(JSON.stringify(updates.avatar_colors));
        }
        if (updates.bio !== undefined) {
          updateParts.push('bio = ?');
          values.push(updates.bio || '');
        }
        if (updates.is_onboarded !== undefined) {
          updateParts.push('is_onboarded = ?');
          values.push(updates.is_onboarded ? 1 : 0);
        }
        if (updates.default_tags !== undefined) {
          updateParts.push('default_tags = ?');
          values.push(JSON.stringify(updates.default_tags));
        }

        values.push(userId);

        await db.execute(
          `UPDATE profiles SET ${updateParts.join(', ')} WHERE user_id = ?`,
          values
        );

        return {
          ...current,
          ...updates,
          updated_at: now,
        };
      },

      async completeOnboarding(profileData: ProfileUpdate): Promise<Profile> {
        return this.update({ ...profileData, is_onboarded: true });
      },
    },

    graph: {
      async logEdgeInteraction(
        sourceNoteId: string,
        targetNoteId: string,
        interactionType: string
      ): Promise<void> {
        const userId = ensureUserId();
        const db = await ensureDb();
        const id = generateUUID();
        const now = getCurrentTimestamp();

        await db.execute(
          `INSERT INTO edge_interactions (id, user_id, source_note_id, target_note_id, interaction_type, created_at) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, userId, sourceNoteId, targetNoteId, interactionType, now]
        );
      },

      async logNoteAccess(noteId: string): Promise<void> {
        const userId = ensureUserId();
        const db = await ensureDb();
        const id = generateUUID();
        const now = getCurrentTimestamp();

        await db.execute(
          'INSERT INTO note_access_log (id, user_id, note_id, created_at) VALUES (?, ?, ?, ?)',
          [id, userId, noteId, now]
        );
      },

      async getEdgeStrength(): Promise<Array<{ source_note_id: string; target_note_id: string; strength: number }>> {
        const userId = ensureUserId();
        const db = await ensureDb();

        const result = await db.select<EdgeStrengthRow[]>(
          `WITH link_strength AS (
            SELECT source_note_id, target_note_id, 1.0 as strength
            FROM links
            WHERE user_id = ?
          ),
          interaction_strength AS (
            SELECT source_note_id, target_note_id, COUNT(*) * 0.1 as strength
            FROM edge_interactions
            WHERE user_id = ?
            GROUP BY source_note_id, target_note_id
          ),
          -- Hebbian co-access: notes accessed within 5 minutes of each other
          -- "Fire together, wire together" — frequent co-access strengthens edges
          co_access AS (
            SELECT 
              CASE WHEN a.note_id < b.note_id THEN a.note_id ELSE b.note_id END as source_note_id,
              CASE WHEN a.note_id < b.note_id THEN b.note_id ELSE a.note_id END as target_note_id,
              COUNT(*) * 0.05 as strength
            FROM note_access_log a
            INNER JOIN note_access_log b
              ON a.user_id = b.user_id
              AND a.note_id < b.note_id
              AND ABS(
                CAST((julianday(a.created_at) - julianday(b.created_at)) * 86400 AS INTEGER)
              ) <= 300  -- within 5 minutes (300 seconds)
            WHERE a.user_id = ?
            GROUP BY 
              CASE WHEN a.note_id < b.note_id THEN a.note_id ELSE b.note_id END,
              CASE WHEN a.note_id < b.note_id THEN b.note_id ELSE a.note_id END
          ),
          -- Merge all strength sources
          combined AS (
            SELECT source_note_id, target_note_id, strength FROM link_strength
            UNION ALL
            SELECT source_note_id, target_note_id, strength FROM interaction_strength
            UNION ALL
            SELECT source_note_id, target_note_id, strength FROM co_access
          )
          SELECT 
            source_note_id,
            target_note_id,
            MIN(2.0, SUM(strength)) as strength
          FROM combined
          GROUP BY source_note_id, target_note_id`,
          [userId, userId, userId]
        );

        return result.map(row => ({
          source_note_id: row.source_note_id,
          target_note_id: row.target_note_id,
          strength: row.strength,
        }));
      },
    },

    planning: {
      async getDailyPlan(date: string): Promise<DailyPlan | null> {
        const userId = ensureUserId();
        const db = await ensureDb();
        const result = await db.select<DailyPlanRow[]>(
          'SELECT * FROM daily_plans WHERE user_id = ? AND plan_date = ?',
          [userId, date]
        );
        if (result.length === 0) return null;
        return mapRowToDailyPlan(result[0]);
      },

      async getOrCreateDailyPlan(date: string): Promise<DailyPlan> {
        const existing = await this.getDailyPlan(date);
        if (existing) return existing;

        const userId = ensureUserId();
        const db = await ensureDb();
        const id = generateUUID();
        const now = getCurrentTimestamp();

        await db.execute(
          'INSERT INTO daily_plans (id, user_id, plan_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [id, userId, date, now, now]
        );

        return {
          id,
          user_id: userId,
          plan_date: date,
          review_notes: null,
          review_completed: false,
          created_at: now,
          updated_at: now,
        };
      },

      async updateDailyPlan(id: string, input: UpdateDailyPlanInput): Promise<DailyPlan> {
        const db = await ensureDb();
        const now = getCurrentTimestamp();
        const updates: string[] = ['updated_at = ?'];
        const values: (string | number | null)[] = [now];

        if (input.review_notes !== undefined) {
          updates.push('review_notes = ?');
          values.push(input.review_notes);
        }
        if (input.review_completed !== undefined) {
          updates.push('review_completed = ?');
          values.push(input.review_completed ? 1 : 0);
        }

        values.push(id);
        await db.execute(`UPDATE daily_plans SET ${updates.join(', ')} WHERE id = ?`, values);

        const result = await db.select<DailyPlanRow[]>('SELECT * FROM daily_plans WHERE id = ?', [id]);
        if (result.length === 0) throw new Error('Daily plan not found');
        return mapRowToDailyPlan(result[0]);
      },

      async getDailyPlanWithDetails(date: string): Promise<DailyPlanWithDetails> {
        const plan = await this.getOrCreateDailyPlan(date);

        const targets = await this.getTargets(plan.id);
        const timeBlocks = await this.getTimeBlocks(plan.id);

        const totalTargets = targets.length;
        const completedTargets = targets.filter(t => t.status === 'completed').length;
        const completionRate = totalTargets > 0 ? (completedTargets / totalTargets) * 100 : 0;

        return { ...plan, targets, timeBlocks, completionRate };
      },

      async getPlansInRange(startDate: string, endDate: string): Promise<DailyPlan[]> {
        const userId = ensureUserId();
        const db = await ensureDb();
        const result = await db.select<DailyPlanRow[]>(
          'SELECT * FROM daily_plans WHERE user_id = ? AND plan_date BETWEEN ? AND ? ORDER BY plan_date ASC',
          [userId, startDate, endDate]
        );
        return result.map(mapRowToDailyPlan);
      },

      async getPlansInRangeWithDetails(startDate: string, endDate: string): Promise<DailyPlanWithDetails[]> {
        const plans = await this.getPlansInRange(startDate, endDate);
        const plansWithDetails: DailyPlanWithDetails[] = [];

        for (const plan of plans) {
          const targets = await this.getTargets(plan.id);
          const timeBlocks = await this.getTimeBlocks(plan.id);

          const totalTargets = targets.length;
          const completedTargets = targets.filter(t => t.status === 'completed').length;
          const completionRate = totalTargets > 0 ? (completedTargets / totalTargets) * 100 : 0;

          plansWithDetails.push({ ...plan, targets, timeBlocks, completionRate });
        }

        return plansWithDetails;
      },

      async getTargets(dailyPlanId: string): Promise<Target[]> {
        const db = await ensureDb();
        const result = await db.select<TargetRow[]>(
          'SELECT * FROM targets WHERE daily_plan_id = ? ORDER BY sort_order ASC, created_at ASC',
          [dailyPlanId]
        );
        return result.map(mapRowToTarget);
      },

      async createTarget(input: CreateTargetInput): Promise<Target> {
        const userId = ensureUserId();
        const db = await ensureDb();
        const id = generateUUID();
        const now = getCurrentTimestamp();

        const maxOrderResult = await db.select<{ max_order: number | null }[]>(
          'SELECT MAX(sort_order) as max_order FROM targets WHERE daily_plan_id = ?',
          [input.daily_plan_id]
        );
        const sortOrder = input.sort_order ?? ((maxOrderResult[0]?.max_order ?? -1) + 1);

        await db.execute(
          `INSERT INTO targets (id, user_id, daily_plan_id, title, description, target_type, estimated_minutes, status, priority, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
          [
            id, userId, input.daily_plan_id, input.title,
            input.description || null,
            input.target_type || 'custom',
            input.estimated_minutes || null,
            input.priority || 'medium',
            sortOrder, now, now,
          ]
        );

        return {
          id,
          user_id: userId,
          daily_plan_id: input.daily_plan_id,
          title: input.title,
          description: input.description || null,
          target_type: (input.target_type || 'custom') as TargetType,
          estimated_minutes: input.estimated_minutes || null,
          actual_minutes: null,
          status: 'pending',
          priority: (input.priority || 'medium') as TargetPriority,
          note_ids: [],
          sort_order: sortOrder,
          created_at: now,
          updated_at: now,
        };
      },

      async updateTarget(id: string, input: UpdateTargetInput): Promise<Target> {
        const db = await ensureDb();
        const now = getCurrentTimestamp();
        const updates: string[] = ['updated_at = ?'];
        const values: (string | number | null)[] = [now];

        if (input.title !== undefined) { updates.push('title = ?'); values.push(input.title); }
        if (input.description !== undefined) { updates.push('description = ?'); values.push(input.description); }
        if (input.target_type !== undefined) { updates.push('target_type = ?'); values.push(input.target_type); }
        if (input.estimated_minutes !== undefined) { updates.push('estimated_minutes = ?'); values.push(input.estimated_minutes); }
        if (input.actual_minutes !== undefined) { updates.push('actual_minutes = ?'); values.push(input.actual_minutes); }
        if (input.status !== undefined) { updates.push('status = ?'); values.push(input.status); }
        if (input.priority !== undefined) { updates.push('priority = ?'); values.push(input.priority); }
        if (input.note_ids !== undefined) { updates.push('note_ids = ?'); values.push(JSON.stringify(input.note_ids)); }
        if (input.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(input.sort_order); }

        values.push(id);
        await db.execute(`UPDATE targets SET ${updates.join(', ')} WHERE id = ?`, values);

        const result = await db.select<TargetRow[]>('SELECT * FROM targets WHERE id = ?', [id]);
        if (result.length === 0) throw new Error('Target not found');
        return mapRowToTarget(result[0]);
      },

      async deleteTarget(id: string): Promise<void> {
        const db = await ensureDb();
        await db.execute('DELETE FROM targets WHERE id = ?', [id]);
      },

      async reorderTargets(dailyPlanId: string, orderedIds: string[]): Promise<void> {
        const db = await ensureDb();
        await db.execute('BEGIN TRANSACTION');
        try {
          for (let i = 0; i < orderedIds.length; i++) {
            await db.execute(
              'UPDATE targets SET sort_order = ?, updated_at = ? WHERE id = ? AND daily_plan_id = ?',
              [i, getCurrentTimestamp(), orderedIds[i], dailyPlanId]
            );
          }
          await db.execute('COMMIT');
        } catch (err) {
          await db.execute('ROLLBACK');
          throw err;
        }
      },

      async getTimeBlocks(dailyPlanId: string): Promise<TimeBlock[]> {
        const db = await ensureDb();
        const result = await db.select<TimeBlockRow[]>(
          'SELECT * FROM time_blocks WHERE daily_plan_id = ? ORDER BY start_time ASC',
          [dailyPlanId]
        );
        return result.map(mapRowToTimeBlock);
      },

      async createTimeBlock(input: CreateTimeBlockInput): Promise<TimeBlock> {
        const userId = ensureUserId();
        const db = await ensureDb();
        const id = generateUUID();
        const now = getCurrentTimestamp();

        await db.execute(
          `INSERT INTO time_blocks (id, user_id, daily_plan_id, target_id, start_time, end_time, block_type, title, color, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, userId, input.daily_plan_id,
            input.target_id || null,
            input.start_time, input.end_time,
            input.block_type || 'focus_work',
            input.title || '',
            input.color || '#6366f1',
            now,
          ]
        );

        return {
          id,
          user_id: userId,
          daily_plan_id: input.daily_plan_id,
          target_id: input.target_id || null,
          start_time: input.start_time,
          end_time: input.end_time,
          block_type: (input.block_type || 'focus_work') as TimeBlockType,
          title: input.title || '',
          color: input.color || '#6366f1',
          created_at: now,
        };
      },

      async updateTimeBlock(id: string, input: UpdateTimeBlockInput): Promise<TimeBlock> {
        const db = await ensureDb();
        const updates: string[] = [];
        const values: (string | number | null)[] = [];

        if (input.target_id !== undefined) { updates.push('target_id = ?'); values.push(input.target_id); }
        if (input.start_time !== undefined) { updates.push('start_time = ?'); values.push(input.start_time); }
        if (input.end_time !== undefined) { updates.push('end_time = ?'); values.push(input.end_time); }
        if (input.block_type !== undefined) { updates.push('block_type = ?'); values.push(input.block_type); }
        if (input.title !== undefined) { updates.push('title = ?'); values.push(input.title); }
        if (input.color !== undefined) { updates.push('color = ?'); values.push(input.color); }

        if (updates.length > 0) {
          values.push(id);
          await db.execute(`UPDATE time_blocks SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const result = await db.select<TimeBlockRow[]>('SELECT * FROM time_blocks WHERE id = ?', [id]);
        if (result.length === 0) throw new Error('Time block not found');
        return mapRowToTimeBlock(result[0]);
      },

      async deleteTimeBlock(id: string): Promise<void> {
        const db = await ensureDb();
        await db.execute('DELETE FROM time_blocks WHERE id = ?', [id]);
      },
    },
  };
}
