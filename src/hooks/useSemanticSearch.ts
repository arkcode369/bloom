import { useState, useCallback, useRef } from 'react';

interface SemanticResult {
  note_id: string;
  similarity: number;
  title?: string;
  preview?: string;
}

interface UseSemanticSearchOptions {
  embed: (text: string) => Promise<number[]>;
  searchByEmbedding: (embedding: number[], limit?: number, threshold?: number) => Promise<{ note_id: string; similarity: number }[]>;
  getNoteById: (id: string) => Promise<{ id: string; title: string; content: string } | null>;
  isEnabled: boolean;
}

export function useSemanticSearch({
  embed,
  searchByEmbedding,
  getNoteById,
  isEnabled,
}: UseSemanticSearchOptions) {
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    async (query: string, limit: number = 10) => {
      if (!isEnabled || !query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const queryEmbedding = await embed(query);
        const matches = await searchByEmbedding(queryEmbedding, limit, 0.25);

        const enriched: SemanticResult[] = await Promise.all(
          matches.map(async (m) => {
            const note = await getNoteById(m.note_id);
            return {
              note_id: m.note_id,
              similarity: m.similarity,
              title: note?.title || 'Untitled',
              preview: note?.content?.slice(0, 150) || '',
            };
          })
        );

        setResults(enriched);
      } catch (err: any) {
        setError(err.message || 'Semantic search failed');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [isEnabled, embed, searchByEmbedding, getNoteById]
  );

  const debouncedSearch = useCallback(
    (query: string, limit?: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(query, limit), 300);
    },
    [search]
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isSearching,
    error,
    search,
    debouncedSearch,
    clear,
  };
}

export default useSemanticSearch;
