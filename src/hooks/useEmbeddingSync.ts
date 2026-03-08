/**
 * useEmbeddingSync Hook — Phase 6: Semantic Search
 * Path: src/hooks/useEmbeddingSync.ts
 * 
 * Background embedding generation on app start (batch 20 notes).
 * Incremental re-embed on note update (debounced 5 seconds).
 */
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseEmbeddingSyncOptions {
  embed: (text: string) => Promise<number[]>;
  embedBatch: (texts: string[]) => Promise<number[][]>;
  saveEmbedding: (noteId: string, embedding: number[], model: string, tokenCount: number) => Promise<void>;
  getNotesWithoutEmbeddings: () => Promise<string[]>;
  getNoteById: (id: string) => Promise<{ id: string; title: string; content: string } | null>;
  isEnabled: boolean;
}

export function useEmbeddingSync({
  embed,
  embedBatch,
  saveEmbedding,
  getNotesWithoutEmbeddings,
  getNoteById,
  isEnabled,
}: UseEmbeddingSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Background sync: embed all notes that don't have embeddings yet
   */
  const syncAll = useCallback(async () => {
    if (!isEnabled || isSyncing) return;

    setIsSyncing(true);
    setError(null);

    try {
      const noteIds = await getNotesWithoutEmbeddings();
      setProgress({ done: 0, total: noteIds.length });

      if (noteIds.length === 0) {
        setIsSyncing(false);
        return;
      }

      // Process in batches of 20
      const BATCH_SIZE = 20;
      for (let i = 0; i < noteIds.length; i += BATCH_SIZE) {
        const batch = noteIds.slice(i, i + BATCH_SIZE);
        const notes = await Promise.all(batch.map(id => getNoteById(id)));
        const validNotes = notes.filter((n): n is NonNullable<typeof n> => n !== null);

        if (validNotes.length === 0) continue;

        const texts = validNotes.map(n => `${n.title}\n\n${n.content}`.slice(0, 8000));

        try {
          const embeddings = await embedBatch(texts);
          for (let j = 0; j < validNotes.length; j++) {
            await saveEmbedding(
              validNotes[j].id,
              embeddings[j],
              'text-embedding-3-small',
              Math.ceil(texts[j].length / 4)
            );
          }
        } catch (batchErr) {
          // Fall back to single embedding on batch failure
          for (const note of validNotes) {
            try {
              const text = `${note.title}\n\n${note.content}`.slice(0, 8000);
              const embedding = await embed(text);
              await saveEmbedding(note.id, embedding, 'text-embedding-3-small', Math.ceil(text.length / 4));
            } catch {
              console.error(`[EmbedSync] Failed to embed note ${note.id}`);
            }
          }
        }

        setProgress({ done: Math.min(i + BATCH_SIZE, noteIds.length), total: noteIds.length });

        // Small delay between batches to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err: any) {
      setError(err.message || 'Embedding sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isEnabled, isSyncing, getNotesWithoutEmbeddings, getNoteById, embed, embedBatch, saveEmbedding]);

  /**
   * Incremental: re-embed a single note (debounced 5s after last edit)
   */
  const embedNote = useCallback(
    (noteId: string, title: string, content: string) => {
      if (!isEnabled) return;

      // Clear previous debounce for this note
      const existing = debounceTimers.current.get(noteId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        try {
          const text = `${title}\n\n${content}`.slice(0, 8000);
          const embedding = await embed(text);
          await saveEmbedding(noteId, embedding, 'text-embedding-3-small', Math.ceil(text.length / 4));
        } catch (err) {
          console.error(`[EmbedSync] Failed to re-embed note ${noteId}:`, err);
        }
        debounceTimers.current.delete(noteId);
      }, 5000); // 5 second debounce

      debounceTimers.current.set(noteId, timer);
    },
    [isEnabled, embed, saveEmbedding]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return {
    isSyncing,
    progress,
    error,
    syncAll,
    embedNote,
  };
}

export default useEmbeddingSync;
