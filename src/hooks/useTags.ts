/**
 * Tags Hooks - Uses DataAdapter for environment-aware data operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { toast } from 'sonner';
import type { Tag, NoteTag, TagWithCount, NoteTagWithTag, Note } from '@/lib/data/types';

// Re-export types for backwards compatibility
export type { Tag, NoteTag, TagWithCount };

// Tag color palette — 16 soft / muted tones
export const TAG_COLORS = [
  '#8B9A7C', // Sage
  '#B4A7D6', // Lavender
  '#E8B4B8', // Coral
  '#A8D5BA', // Mint
  '#F5D89A', // Honey
  '#9FC5E8', // Sky
  '#D5A6BD', // Mauve
  '#F9C68A', // Peach
  '#A8C4E0', // Ice blue
  '#C3D9A2', // Lime
  '#E6C8A0', // Sand
  '#C5B8E8', // Wisteria
  '#F4B8B8', // Blush
  '#B0D4C8', // Teal mist
  '#E8D4A8', // Cream
  '#8BBFD4', // Steel blue
];

// Emoji icon set for tags
export const TAG_ICONS = [
  '📌', '📎', '🏷️', '🔖', '⭐', '✨', '💡', '🎯',
  '📚', '📝', '🎨', '🎵', '🏋️', '💼', '🔬', '🌿',
  '🏠', '🚀', '💎', '🔥', '❤️', '🌊', '🌙', '☀️',
  '🍀', '🎸', '🎭', '🏆', '🌍', '💻', '🛠️', '✏️',
  '🐉', '🦋', '🌸', '🧠', '⚡', '🎪', '🔮', '🌈',
];

export function useTags() {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      return adapter.tags.getAll();
    },
  });
}

export function useNoteTags(noteId: string | null) {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['note-tags', noteId],
    queryFn: async () => {
      if (!noteId) return [];
      return adapter.noteTags.getByNoteId(noteId);
    },
    enabled: !!noteId,
  });
}

export function useTagsWithCounts() {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['tags-with-counts'],
    queryFn: async () => {
      return adapter.tags.getAllWithCounts();
    },
  });
}

export function useNotesByTag(tagId: string | null) {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['notes-by-tag', tagId],
    queryFn: async () => {
      if (!tagId) return [];
      return adapter.noteTags.getNotesByTagId(tagId);
    },
    enabled: !!tagId,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async ({ name, color, icon }: { name: string; color?: string; icon?: string | null }) => {
      return adapter.tags.create({ name, color: color || TAG_COLORS[0], icon });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
    },
    onError: (error) => {
      toast.error('Failed to create tag: ' + error.message);
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async ({ id, name, color, icon }: { id: string; name?: string; color?: string; icon?: string | null }) => {
      return adapter.tags.update(id, { name, color, icon });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['note-tags'] });
      queryClient.invalidateQueries({ queryKey: ['graph-data'] });
    },
    onError: (error) => {
      toast.error('Failed to update tag: ' + error.message);
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async (tagId: string) => {
      await adapter.tags.delete(tagId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['note-tags'] });
      queryClient.invalidateQueries({ queryKey: ['graph-data'] });
      toast.success('Tag deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete tag: ' + error.message);
    },
  });
}

export function useAddTagToNote() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async ({ noteId, tagId }: { noteId: string; tagId: string }) => {
      return adapter.noteTags.addTagToNote(noteId, tagId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['note-tags', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['notes-by-tag', variables.tagId] });
      queryClient.invalidateQueries({ queryKey: ['graph-data'] });
    },
    onError: (error) => {
      toast.error('Failed to add tag: ' + error.message);
    },
  });
}

export function useRemoveTagFromNote() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async ({ noteId, tagId }: { noteId: string; tagId: string }) => {
      await adapter.noteTags.removeTagFromNote(noteId, tagId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['note-tags', variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['notes-by-tag', variables.tagId] });
      queryClient.invalidateQueries({ queryKey: ['graph-data'] });
    },
    onError: (error) => {
      toast.error('Failed to remove tag: ' + error.message);
    },
  });
}
