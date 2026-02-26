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
  icon: string | null;
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

// ============= Daily Planning Types =============

export type TargetStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type TargetPriority = 'low' | 'medium' | 'high';
export type TargetType = 'note_creation' | 'research' | 'review' | 'writing' | 'reading' | 'custom';
export type TimeBlockType = 'focus_work' | 'break' | 'review' | 'planning' | 'research' | 'writing' | 'custom';

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string;
  review_notes: string | null;
  review_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Target {
  id: string;
  user_id: string;
  daily_plan_id: string;
  title: string;
  description: string | null;
  target_type: TargetType;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  status: TargetStatus;
  priority: TargetPriority;
  note_ids: string[];
  sort_order: number;
  carried_from_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeBlock {
  id: string;
  user_id: string;
  daily_plan_id: string;
  target_id: string | null;
  start_time: string;
  end_time: string;
  block_type: TimeBlockType;
  title: string;
  color: string;
  created_at: string;
}

export interface CreateDailyPlanInput {
  plan_date: string;
}

export interface UpdateDailyPlanInput {
  review_notes?: string | null;
  review_completed?: boolean;
}

export interface CreateTargetInput {
  daily_plan_id: string;
  title: string;
  description?: string;
  target_type?: TargetType;
  estimated_minutes?: number;
  priority?: TargetPriority;
  sort_order?: number;
}

export interface UpdateTargetInput {
  title?: string;
  description?: string | null;
  target_type?: TargetType;
  estimated_minutes?: number | null;
  actual_minutes?: number | null;
  status?: TargetStatus;
  priority?: TargetPriority;
  note_ids?: string[];
  sort_order?: number;
}

export interface CreateTimeBlockInput {
  daily_plan_id: string;
  target_id?: string;
  start_time: string;
  end_time: string;
  block_type?: TimeBlockType;
  title?: string;
  color?: string;
}

export interface UpdateTimeBlockInput {
  target_id?: string | null;
  start_time?: string;
  end_time?: string;
  block_type?: TimeBlockType;
  title?: string;
  color?: string;
}

export interface DailyPlanWithDetails extends DailyPlan {
  targets: Target[];
  timeBlocks: TimeBlock[];
  completionRate: number;
}

// ============= Writing Stats =============

export interface DailyWritingStat {
  id: string;
  user_id: string;
  date: string;
  total_words: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDailyWritingStatInput {
  date: string;
  total_words: number;
}

export interface UpdateDailyWritingStatInput {
  total_words: number;
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
  icon?: string | null;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  icon?: string | null;
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

  // ============= Daily Planning =============
  planning: {
    getDailyPlan(date: string): Promise<DailyPlan | null>;
    getOrCreateDailyPlan(date: string): Promise<DailyPlan>;
    updateDailyPlan(id: string, input: UpdateDailyPlanInput): Promise<DailyPlan>;
    getDailyPlanWithDetails(date: string): Promise<DailyPlanWithDetails>;
    getPlansInRange(startDate: string, endDate: string): Promise<DailyPlan[]>;
    getPlansInRangeWithDetails(startDate: string, endDate: string): Promise<DailyPlanWithDetails[]>;

    getTargets(dailyPlanId: string): Promise<Target[]>;
    createTarget(input: CreateTargetInput): Promise<Target>;
    updateTarget(id: string, input: UpdateTargetInput): Promise<Target>;
    deleteTarget(id: string): Promise<void>;
    reorderTargets(dailyPlanId: string, orderedIds: string[]): Promise<void>;

    getTimeBlocks(dailyPlanId: string): Promise<TimeBlock[]>;
    createTimeBlock(input: CreateTimeBlockInput): Promise<TimeBlock>;
    updateTimeBlock(id: string, input: UpdateTimeBlockInput): Promise<TimeBlock>;
    deleteTimeBlock(id: string): Promise<void>;
  };

  // ============= Writing Stats =============
  writingStats: {
    getByDate(date: string): Promise<DailyWritingStat | null>;
    getInRange(startDate: string, endDate: string): Promise<DailyWritingStat[]>;
    upsert(input: CreateDailyWritingStatInput): Promise<DailyWritingStat>;
  };
}

// ============= Environment Detection =============

export type DataAdapterType = 'sqlite';

export function detectEnvironment(): DataAdapterType {
  return 'sqlite';
}
