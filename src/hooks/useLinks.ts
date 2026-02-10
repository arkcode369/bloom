/**
 * Links Hooks - Uses DataAdapter for environment-aware data operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import type { Link, BacklinkWithNote, NoteLinks, Note } from '@/lib/data/types';

// Re-export types for backwards compatibility
export type { Link, BacklinkWithNote, NoteLinks };

// Get all links for a specific note (both outgoing and incoming)
export function useNoteLinks(noteId: string | null) {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['links', noteId],
    queryFn: async () => {
      if (!noteId) return { outgoing: [], incoming: [] };
      return adapter.links.getByNoteId(noteId);
    },
    enabled: !!noteId,
  });
}

// Get backlinks with full note data and context
export function useBacklinks(noteId: string | null) {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['backlinks', noteId],
    queryFn: async () => {
      if (!noteId) return [];
      return adapter.links.getBacklinks(noteId);
    },
    enabled: !!noteId,
  });
}

// Sync links when note content changes
export function useSyncLinks() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async ({ noteId, content, allNotes }: { 
      noteId: string; 
      content: string; 
      allNotes: Note[];
    }) => {
      return adapter.links.syncLinks(noteId, content, allNotes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
      queryClient.invalidateQueries({ queryKey: ['graph-data'] });
    },
  });
}

// Create note from wikilink
export function useCreateNoteFromLink() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async ({ title, sourceNoteId }: { title: string; sourceNoteId: string }) => {
      return adapter.links.createNoteFromLink(title, sourceNoteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['backlinks'] });
      queryClient.invalidateQueries({ queryKey: ['graph-data'] });
    },
  });
}
