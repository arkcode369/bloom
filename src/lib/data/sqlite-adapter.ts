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
          )
          SELECT 
            l.source_note_id,
            l.target_note_id,
            MIN(2.0, COALESCE(l.strength, 0) + COALESCE(i.strength, 0)) as strength
          FROM link_strength l
          LEFT JOIN interaction_strength i 
            ON l.source_note_id = i.source_note_id AND l.target_note_id = i.target_note_id
          UNION
          SELECT 
            i.source_note_id,
            i.target_note_id,
            MIN(2.0, COALESCE(l.strength, 0) + COALESCE(i.strength, 0)) as strength
          FROM interaction_strength i
          LEFT JOIN link_strength l 
            ON l.source_note_id = i.source_note_id AND l.target_note_id = i.target_note_id
          WHERE l.source_note_id IS NULL`,
          [userId, userId]
        );

        return result.map(row => ({
          source_note_id: row.source_note_id,
          target_note_id: row.target_note_id,
          strength: row.strength,
        }));
      },
    },
  };
}
