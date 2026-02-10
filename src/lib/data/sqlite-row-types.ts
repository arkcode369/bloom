export interface NoteRow {
    id: string;
    user_id: string;
    title: string;
    content: string | null;
    cover_image: string | null;
    is_starred: number;
    is_archived: number;
    is_pinned: number;
    created_at: string;
    updated_at: string;
}

export interface TagRow {
    id: string;
    user_id: string;
    name: string;
    color: string | null;
    created_at: string;
}

export interface TagWithCountRow extends TagRow {
    note_count: number;
}

export interface NoteTagJoinRow {
    id: string;
    note_id: string;
    tag_id: string;
    created_at: string;
    t_id: string;
    t_user_id: string;
    name: string;
    color: string | null;
    t_created_at: string;
}

export interface LinkRow {
    id: string;
    source_note_id: string;
    target_note_id: string;
    user_id: string;
    created_at: string;
}

export interface BacklinkJoinRow extends LinkRow {
    n_id: string;
    n_user_id: string;
    title: string;
    content: string | null;
    cover_image: string | null;
    is_starred: number;
    is_archived: number;
    is_pinned: number;
    n_created_at: string;
    updated_at: string;
}

export interface NoteVersionRow {
    id: string;
    note_id: string;
    title: string | null;
    content: string | null;
    created_at: string;
}

export interface ProfileRow {
    id: string;
    user_id: string;
    display_name: string | null;
    avatar_style: string;
    avatar_colors: string;
    bio: string | null;
    is_onboarded: number;
    default_tags: string;
    created_at: string;
    updated_at: string;
}

export interface EdgeInteractionRow {
    id: string;
    user_id: string;
    source_note_id: string;
    target_note_id: string;
    interaction_type: string;
    created_at: string;
}

export interface EdgeStrengthRow {
    source_note_id: string;
    target_note_id: string;
    strength: number;
}

export interface NoteTagExistingRow {
    id: string;
    created_at: string;
}

export interface ExistingLinkRow {
    id: string;
    target_note_id: string;
}

export interface VersionTimestampRow {
    created_at: string;
}

export interface VersionRestoreRow {
    note_id: string;
    title: string;
    content: string;
}
