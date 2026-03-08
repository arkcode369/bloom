/**
 * useAutoTag Hook — Phase 5: Smart Tagging System
 * Path: src/hooks/useAutoTag.ts
 * 
 * Trigger saat note disimpan, kirim content ke AI dengan existing tags sebagai context.
 * Supports single note analysis and bulk re-tagging.
 */
import { useState, useCallback } from 'react';

interface TagSuggestion {
  name: string;
  confidence: number;
  isExisting: boolean;
  existingId?: string;
}

interface UseAutoTagOptions {
  chat: (messages: { role: string; content: string }[]) => Promise<string>;
  isEnabled: boolean;
  getAllTags: () => Promise<{ id: string; name: string; color: string }[]>;
  saveTagSuggestions: (
    noteId: string,
    tags: string[],
    confidence: number[],
    model: string
  ) => Promise<void>;
}

export function useAutoTag({ chat, isEnabled, getAllTags, saveTagSuggestions }: UseAutoTagOptions) {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeNote = useCallback(
    async (noteId: string, title: string, content: string) => {
      if (!isEnabled || !content.trim()) return;

      setIsAnalyzing(true);
      setError(null);

      try {
        const existingTags = await getAllTags();
        const tagNames = existingTags.map(t => t.name);

        const systemPrompt = `You are a note tagging assistant. Analyze the note and suggest relevant tags.

Existing tags in the system: [${tagNames.join(', ')}]

Rules:
- Prefer existing tags when they match the content
- Suggest 2-5 tags total
- Each tag should be 1-3 words, lowercase, no special characters
- Return ONLY valid JSON array of objects with "name" and "confidence" (0.0-1.0)

Example response:
[{"name": "javascript", "confidence": 0.95}, {"name": "tutorial", "confidence": 0.8}]`;

        const userMessage = `Title: ${title}\n\nContent:\n${content.slice(0, 2000)}`;

        const result = await chat([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ]);

        // Parse JSON from response
        const jsonMatch = result.match(/\[.*\]/s);
        if (!jsonMatch) throw new Error('Invalid AI response format');

        const parsed: { name: string; confidence: number }[] = JSON.parse(jsonMatch[0]);

        const tagSuggestions: TagSuggestion[] = parsed.map(s => {
          const existing = existingTags.find(
            t => t.name.toLowerCase() === s.name.toLowerCase()
          );
          return {
            name: s.name.toLowerCase().trim(),
            confidence: Math.min(1, Math.max(0, s.confidence)),
            isExisting: !!existing,
            existingId: existing?.id,
          };
        });

        setSuggestions(tagSuggestions);

        // Cache suggestions in DB
        await saveTagSuggestions(
          noteId,
          tagSuggestions.map(s => s.name),
          tagSuggestions.map(s => s.confidence),
          'ai'
        );
      } catch (err: any) {
        setError(err.message || 'Failed to analyze note');
        setSuggestions([]);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isEnabled, chat, getAllTags, saveTagSuggestions]
  );

  const bulkAnalyze = useCallback(
    async (notes: { id: string; title: string; content: string }[]) => {
      if (!isEnabled) return;
      setIsAnalyzing(true);
      setError(null);

      try {
        const existingTags = await getAllTags();
        const tagNames = existingTags.map(t => t.name);

        const systemPrompt = `You are a note tagging assistant. Analyze multiple notes and suggest tags for each.

Existing tags: [${tagNames.join(', ')}]

Return JSON object where keys are note IDs and values are arrays of {name, confidence}.
Suggest 2-4 tags per note. Prefer existing tags.`;

        const notesSummary = notes
          .slice(0, 10)
          .map(n => `[${n.id}] ${n.title}: ${n.content.slice(0, 300)}`)
          .join('\n---\n');

        const result = await chat([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: notesSummary },
        ]);

        const jsonMatch = result.match(/\{.*\}/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          for (const [noteId, tags] of Object.entries(parsed)) {
            const tagArray = tags as { name: string; confidence: number }[];
            await saveTagSuggestions(
              noteId,
              tagArray.map((t: any) => t.name),
              tagArray.map((t: any) => t.confidence),
              'ai'
            );
          }
        }
      } catch (err: any) {
        setError(err.message || 'Bulk analysis failed');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isEnabled, chat, getAllTags, saveTagSuggestions]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    isAnalyzing,
    error,
    analyzeNote,
    bulkAnalyze,
    clearSuggestions,
  };
}

export default useAutoTag;
