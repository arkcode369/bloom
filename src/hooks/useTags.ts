/**
 * Tags Hooks - Uses DataAdapter for environment-aware data operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { toast } from 'sonner';
import type { Tag, NoteTag, TagWithCount, NoteTagWithTag, Note } from '@/lib/data/types';

// Re-export types for backwards compatibility
export type { Tag, NoteTag, TagWithCount };

// Tag color palette
export const TAG_COLORS = [
  '#8B9A7C', // Sage green (default)
  '#B8A9C9', // Lavender
  '#E8B4B8', // Soft coral
  '#A8D5BA', // Mint
  '#F5D89A', // Honey
  '#9FC5E8', // Sky blue
  '#E6B8AF', // Blush
  '#C9DAF8', // Periwinkle
  '#D5A6BD', // Mauve
  '#B4A7D6', // Purple mist
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
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      return adapter.tags.create({ name, color: color || TAG_COLORS[0] });
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
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      return adapter.tags.update(id, { name, color });
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
