/**
 * Data Layer Abstraction Types
 * 
 * This module defines the core data interfaces for the application.
 */

// ============= Entity Types =============

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  cover_image: string | null;
  is_starred: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface NoteTag {
  id: string;
  note_id: string;
  tag_id: string;
  created_at: string;
}

export interface Link {
  id: string;
  source_note_id: string;
  target_note_id: string;
  user_id: string;
  created_at: string;
}

export interface NoteVersion {
  id: string;
  note_id: string;
  title: string;
  content: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_style: AvatarStyle;
  avatar_colors: string[];
  bio: string | null;
  is_onboarded: boolean;
  default_tags: string[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
}

export type AvatarStyle = 'beam' | 'marble' | 'pixel' | 'sunset' | 'ring' | 'bauhaus';

// ============= Input Types =============

export interface CreateNoteInput {
  title?: string;
  content?: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  cover_image?: string | null;
  is_starred?: boolean;
  is_archived?: boolean;
  is_pinned?: boolean;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export interface ProfileUpdate {
  display_name?: string | null;
  avatar_style?: AvatarStyle;
  avatar_colors?: string[];
  bio?: string | null;
  is_onboarded?: boolean;
  default_tags?: string[];
}

// ============= Query Result Types =============

export interface TagWithCount extends Tag {
  noteCount: number;
}

export interface NoteTagWithTag extends NoteTag {
  tag: Tag;
}

export interface BacklinkWithNote {
  link: Link;
  sourceNote: Note;
  context: string;
}

export interface NoteLinks {
  outgoing: Link[];
  incoming: Link[];
}

// ============= Auth Types =============

export interface AuthResult {
  error: Error | null;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

// ============= Data Adapter Interface =============

/**
 * DataAdapter is the main interface that abstracts all data operations.
 * Implementation: SQLiteAdapter (desktop)
 */
export interface DataAdapter {
  // ============= Auth =============
  auth: {
    getCurrentUser(): Promise<User | null>;
    deleteAccount(): Promise<AuthResult>;
    onAuthStateChange(callback: (user: User | null) => void): () => void;
  };

  // ============= Notes =============
  notes: {
    getAll(): Promise<Note[]>;
    getById(id: string): Promise<Note | null>;
    getStarred(): Promise<Note[]>;
    getArchived(): Promise<Note[]>;
    getPinned(): Promise<Note[]>;
    search(query: string): Promise<Note[]>;
    create(input: CreateNoteInput, defaultTagIds?: string[], id?: string): Promise<Note>;
    update(id: string, input: UpdateNoteInput): Promise<Note>;
    delete(id: string): Promise<void>;
    toggleStar(id: string, isStarred: boolean): Promise<Note>;
    togglePin(id: string, isPinned: boolean): Promise<Note>;
    archive(id: string): Promise<Note>;
    unarchive(id: string): Promise<Note>;
    getVersions(noteId: string): Promise<NoteVersion[]>;
    restoreVersion(versionId: string): Promise<Note>;
  };

  // ============= Tags =============
  tags: {
    getAll(): Promise<Tag[]>;
    getAllWithCounts(): Promise<TagWithCount[]>;
    create(input: CreateTagInput): Promise<Tag>;
    update(id: string, input: UpdateTagInput): Promise<Tag>;
    delete(id: string): Promise<void>;
  };

  // ============= Note Tags =============
  noteTags: {
    getByNoteId(noteId: string): Promise<NoteTagWithTag[]>;
    getNotesByTagId(tagId: string): Promise<Note[]>;
    addTagToNote(noteId: string, tagId: string): Promise<NoteTag>;
    removeTagFromNote(noteId: string, tagId: string): Promise<void>;
  };

  // ============= Links =============
  links: {
    getByNoteId(noteId: string): Promise<NoteLinks>;
    getBacklinks(noteId: string): Promise<BacklinkWithNote[]>;
    syncLinks(noteId: string, content: string, allNotes: Note[]): Promise<{ added: number; removed: number }>;
    createNoteFromLink(title: string, sourceNoteId: string): Promise<Note>;
  };

  // ============= Profile =============
  profile: {
    get(): Promise<Profile | null>;
    update(updates: ProfileUpdate): Promise<Profile>;
    completeOnboarding(profileData: ProfileUpdate): Promise<Profile>;
  };

  // ============= Graph Interactions =============
  graph: {
    logEdgeInteraction(sourceNoteId: string, targetNoteId: string, interactionType: string): Promise<void>;
    logNoteAccess(noteId: string): Promise<void>;
    getEdgeStrength(): Promise<Array<{ source_note_id: string; target_note_id: string; strength: number }>>;
  };
}

// ============= Environment Detection =============

export type DataAdapterType = 'sqlite';

export function detectEnvironment(): DataAdapterType {
  return 'sqlite';
}
