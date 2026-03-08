import { useState, useCallback } from 'react';

interface SuggestedLink {
  noteId: string;
  noteTitle: string;
  similarity: number;
  alreadyLinked: boolean;
}

interface UseAutoLinkOptions {
  searchByEmbedding: (embedding: number[], limit?: number, threshold?: number) => Promise<{ note_id: string; similarity: number }[]>;
  getEmbedding: (noteId: string) => Promise<number[] | null>;
  getNoteById: (id: string) => Promise<{ id: string; title: string; content: string } | null>;
  getLinkedNoteIds: (noteId: string) => Promise<string[]>;
  isEnabled: boolean;
}

export function useAutoLink({
  searchByEmbedding,
  getEmbedding,
  getNoteById,
  getLinkedNoteIds,
  isEnabled,
}: UseAutoLinkOptions) {
  const [suggestedLinks, setSuggestedLinks] = useState<SuggestedLink[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findRelatedNotes = useCallback(
    async (noteId: string, limit: number = 8) => {
      if (!isEnabled) return;

      setIsAnalyzing(true);
      setError(null);

      try {
        const embedding = await getEmbedding(noteId);
        if (!embedding) {
          setSuggestedLinks([]);
          return;
        }

        const matches = await searchByEmbedding(embedding, limit + 1, 0.3);
        const filtered = matches.filter(m => m.note_id !== noteId).slice(0, limit);

        const linkedIds = await getLinkedNoteIds(noteId);
        const linkedSet = new Set(linkedIds);

        const suggestions: SuggestedLink[] = await Promise.all(
          filtered.map(async (m) => {
            const note = await getNoteById(m.note_id);
            return {
              noteId: m.note_id,
              noteTitle: note?.title || 'Untitled',
              similarity: m.similarity,
              alreadyLinked: linkedSet.has(m.note_id),
            };
          })
        );

        setSuggestedLinks(suggestions);
      } catch (err: any) {
        setError(err.message || 'Auto-link analysis failed');
        setSuggestedLinks([]);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isEnabled, getEmbedding, searchByEmbedding, getNoteById, getLinkedNoteIds]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestedLinks([]);
    setError(null);
  }, []);

  return {
    suggestedLinks,
    isAnalyzing,
    error,
    findRelatedNotes,
    clearSuggestions,
  };
}

export default useAutoLink;
