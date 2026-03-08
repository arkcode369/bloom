/**
 * useAutoLink Hook — Phase 7: Auto-linking (Smart Wikilinks)
 * Path: src/hooks/useAutoLink.ts
 * 
 * Find related notes via embedding similarity.
 * Suggest wikilinks that don't exist yet.
 * Powers the SuggestedLinks panel and KnowledgeGraph dashed edges.
 */
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

  /**
   * Find related notes for a given note using embedding similarity
   */
  const findRelatedNotes = useCallback(
    async (noteId: string, limit: number = 8) => {
      if (!isEnabled) return;

      setIsAnalyzing(true);
      setError(null);

      try {
        // Get this note's embedding
        const embedding = await getEmbedding(noteId);
        if (!embedding) {
          setSuggestedLinks([]);
          setIsAnalyzing(false);
          return;
        }

        // Find similar notes via cosine similarity
        const matches = await searchByEmbedding(embedding, limit + 1, 0.3);

        // Filter out self
        const filtered = matches.filter(m => m.note_id !== noteId).slice(0, limit);

        // Get existing links to mark which are already linked
        const linkedIds = await getLinkedNoteIds(noteId);
        const linkedSet = new Set(linkedIds);

        // Enrich with note metadata
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

  /**
   * Build a full relationship matrix for KnowledgeGraph integration.
   * Returns edges with similarity scores for dashed-edge rendering.
   */
  const buildRelationshipMatrix = useCallback(
    async (noteIds: string[], topN: number = 3): Promise<{ source: string; target: string; similarity: number }[]> => {
      if (!isEnabled) return [];

      const edges: { source: string; target: string; similarity: number }[] = [];
      const seen = new Set<string>();

      for (const noteId of noteIds) {
        const embedding = await getEmbedding(noteId);
        if (!embedding) continue;

        const matches = await searchByEmbedding(embedding, topN + 1, 0.4);
        for (const match of matches) {
          if (match.note_id === noteId) continue;
          
          // Deduplicate bidirectional edges
          const edgeKey = [noteId, match.note_id].sort().join(':');
          if (seen.has(edgeKey)) continue;
          seen.add(edgeKey);

          edges.push({
            source: noteId,
            target: match.note_id,
            similarity: match.similarity,
          });
        }
      }

      return edges;
    },
    [isEnabled, getEmbedding, searchByEmbedding]
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
    buildRelationshipMatrix,
    clearSuggestions,
  };
}

export default useAutoLink;
