import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { toast } from 'sonner';
import type { Note, CreateNoteInput, UpdateNoteInput } from '@/lib/data/types';

export type { Note, CreateNoteInput, UpdateNoteInput };

export function useNotes() {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      return adapter.notes.getAll();
    },
  });
}

export function useNote(id: string | null) {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['note', id],
    queryFn: async () => {
      if (!id) return null;
      return adapter.notes.getById(id);
    },
    enabled: !!id,
  });
}

export function useStarredNotes() {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['notes', 'starred'],
    queryFn: async () => {
      return adapter.notes.getStarred();
    },
  });
}

export function usePinnedNotes() {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['notes', 'pinned'],
    queryFn: async () => {
      return adapter.notes.getPinned();
    },
  });
}

export function useSearchNotes() {
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async (query: string) => {
      return adapter.notes.search(query);
    },
  });
}

export function useArchivedNotes() {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['notes', 'archived'],
    queryFn: async () => {
      return adapter.notes.getArchived();
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const profile = queryClient.getQueryData<{ default_tags?: string[] }>(['profile']);
      const defaultTagIds = profile?.default_tags || [];
      return adapter.notes.create(input, defaultTagIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['graph-data'] });
    },
    onError: (error) => {
      toast.error('Failed to create note: ' + error.message);
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateNoteInput & { id: string }) => {
      return adapter.notes.update(id, input);
    },
    onSuccess: (updatedNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (updatedNote) {
        queryClient.setQueryData(['note', updatedNote.id], updatedNote);
      }
    },
    onError: (error) => {
      toast.error('Failed to update note: ' + error.message);
    },
  });
}

export function useToggleStar() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async ({ id, is_starred }: { id: string; is_starred: boolean }) => {
      return adapter.notes.toggleStar(id, is_starred);
    },
    onMutate: async ({ id, is_starred }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      await queryClient.cancelQueries({ queryKey: ['notes', 'starred'] });

      const previousNotes = queryClient.getQueryData<Note[]>(['notes']);
      const previousStarred = queryClient.getQueryData<Note[]>(['notes', 'starred']);

      queryClient.setQueryData<Note[]>(['notes'], (old) =>
        old?.map(n => n.id === id ? { ...n, is_starred } : n)
      );

      if (is_starred && previousNotes) {
        const note = previousNotes.find(n => n.id === id);
        if (note) {
          queryClient.setQueryData<Note[]>(['notes', 'starred'], (old) => [
            ...(old || []),
            { ...note, is_starred: true },
          ]);
        }
      } else {
        queryClient.setQueryData<Note[]>(['notes', 'starred'], (old) =>
          old?.filter(n => n.id !== id)
        );
      }

      return { previousNotes, previousStarred };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
      if (context?.previousStarred) {
        queryClient.setQueryData(['notes', 'starred'], context.previousStarred);
      }
      toast.error('Failed to update star');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'starred'] });
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      return adapter.notes.togglePin(id, is_pinned);
    },
    onMutate: async ({ id, is_pinned }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      const previousNotes = queryClient.getQueryData<Note[]>(['notes']);

      queryClient.setQueryData<Note[]>(['notes'], (old) =>
        old?.map(n => n.id === id ? { ...n, is_pinned } : n)
      );

      return { previousNotes };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
      toast.error('Failed to update pin');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'pinned'] });
    },
  });
}

export function useArchiveNote() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async (id: string) => {
      return adapter.notes.archive(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      const previousNotes = queryClient.getQueryData<Note[]>(['notes']);

      queryClient.setQueryData<Note[]>(['notes'], (old) =>
        old?.filter(n => n.id !== id)
      );
      queryClient.setQueryData<Note[]>(['notes', 'starred'], (old) =>
        old?.filter(n => n.id !== id)
      );

      return { previousNotes };
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
      toast.error('Failed to archive note');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'starred'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async (id: string) => {
      return adapter.notes.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'starred'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['graph-data'] });
    },
    onError: (error) => {
      toast.error('Failed to delete note: ' + error.message);
    },
  });
}

export function useUnarchiveNote() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async (id: string) => {
      return adapter.notes.unarchive(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'archived'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
    },
    onError: (error) => {
      toast.error('Failed to unarchive note: ' + error.message);
    },
  });
}

export function useNoteVersions(noteId: string) {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['note-versions', noteId],
    queryFn: async () => {
      return adapter.notes.getVersions(noteId);
    },
    enabled: !!noteId,
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();
  const adapter = useDataAdapter();

  return useMutation({
    mutationFn: async (versionId: string) => {
      return adapter.notes.restoreVersion(versionId);
    },
    onSuccess: (restoredNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (restoredNote) {
        queryClient.setQueryData(['note', restoredNote.id], restoredNote);
        queryClient.invalidateQueries({ queryKey: ['note-versions', restoredNote.id] });
      }
    },
    onError: (error) => {
      toast.error('Failed to restore version: ' + error.message);
    },
  });
}
