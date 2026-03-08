/**
 * useAIChat Hook — Phase 8: AI Chat / Q&A over Notes
 * Path: src/hooks/useAIChat.ts
 * 
 * RAG-based chat: embed query -> cosine search top notes -> inject as context -> LLM.
 * Chat history per session stored in SQLite.
 */
import { useState, useCallback, useRef } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  noteRefs: string[];
  isStreaming?: boolean;
}

interface UseAIChatOptions {
  chatStream: (messages: { role: string; content: string }[], onChunk: (chunk: string) => void) => Promise<string>;
  embed: (text: string) => Promise<number[]>;
  searchByEmbedding: (embedding: number[], limit?: number) => Promise<{ note_id: string; similarity: number }[]>;
  getNoteById: (id: string) => Promise<{ id: string; title: string; content: string } | null>;
  createChatSession: (title?: string) => Promise<string>;
  saveChatMessage: (sessionId: string, role: 'user' | 'assistant' | 'system', content: string, noteRefs?: string[], model?: string) => Promise<string>;
  getChatHistory: (sessionId: string) => Promise<{ id: string; role: string; content: string; note_refs: string[] }[]>;
  isEnabled: boolean;
}

const SYSTEM_PROMPT = `You are Bloom AI, a helpful assistant integrated into a personal knowledge management app called Bloom Notes.

You have access to the user's notes provided as context below. When answering:
- Reference specific notes by title when using information from them
- If the context doesn't contain relevant information, say so honestly
- Be concise but thorough
- Use markdown formatting when helpful
- Respect the user's writing style and note-taking approach`;

export function useAIChat({
  chatStream,
  embed,
  searchByEmbedding,
  getNoteById,
  createChatSession,
  saveChatMessage,
  getChatHistory,
  isEnabled,
}: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  /**
   * RAG: Retrieve relevant notes for a query using embeddings
   */
  const retrieveContext = useCallback(
    async (query: string): Promise<{ context: string; noteIds: string[] }> => {
      try {
        const queryEmbedding = await embed(query);
        const matches = await searchByEmbedding(queryEmbedding, 8);

        const noteIds: string[] = [];
        const contextParts: string[] = [];

        for (const match of matches) {
          const note = await getNoteById(match.note_id);
          if (note) {
            noteIds.push(note.id);
            const content = note.content.slice(0, 1500);
            contextParts.push(
              `--- Note: "${note.title}" (relevance: ${Math.round(match.similarity * 100)}%) ---\n${content}`
            );
          }
        }

        return {
          context: contextParts.join('\n\n'),
          noteIds,
        };
      } catch {
        return { context: '', noteIds: [] };
      }
    },
    [embed, searchByEmbedding, getNoteById]
  );

  /**
   * Send a message and get AI response with RAG context
   */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!isEnabled || !userMessage.trim() || isStreaming) return;

      setError(null);
      abortRef.current = false;

      // Create session if needed
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await createChatSession(userMessage.slice(0, 50));
        setSessionId(currentSessionId);
      }

      // Add user message to state
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
        noteRefs: [],
      };
      setMessages(prev => [...prev, userMsg]);
      await saveChatMessage(currentSessionId, 'user', userMessage);

      // RAG: retrieve relevant notes
      const { context, noteIds } = await retrieveContext(userMessage);

      // Build messages with injected note context
      const systemWithContext = context
        ? `${SYSTEM_PROMPT}\n\n--- RELEVANT NOTES FROM USER'S KNOWLEDGE BASE ---\n${context}\n--- END OF NOTES ---`
        : SYSTEM_PROMPT;

      const apiMessages = [
        { role: 'system', content: systemWithContext },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      // Add placeholder for streaming assistant response
      const assistantId = crypto.randomUUID();
      setMessages(prev => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', noteRefs: noteIds, isStreaming: true },
      ]);

      setIsStreaming(true);

      try {
        let accumulated = '';
        const result = await chatStream(apiMessages, (chunk: string) => {
          if (abortRef.current) return;
          accumulated += chunk;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        });

        const finalContent = result || accumulated;

        // Finalize message (remove streaming indicator)
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: finalContent, isStreaming: false }
              : m
          )
        );

        // Save to database
        await saveChatMessage(currentSessionId, 'assistant', finalContent, noteIds, 'ai');
      } catch (err: any) {
        setError(err.message || 'Chat failed');
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: m.content || 'Error: ' + (err.message || 'Request failed'), isStreaming: false }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isEnabled, isStreaming, sessionId, messages, chatStream, createChatSession, saveChatMessage, retrieveContext]
  );

  /**
   * Load an existing chat session from DB
   */
  const loadSession = useCallback(
    async (id: string) => {
      try {
        const history = await getChatHistory(id);
        setSessionId(id);
        setMessages(
          history.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            noteRefs: m.note_refs || [],
          }))
        );
      } catch (err: any) {
        setError(err.message || 'Failed to load session');
      }
    },
    [getChatHistory]
  );

  /**
   * Start a fresh chat session
   */
  const startNewSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Stop the current streaming response
   */
  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
  }, []);

  return {
    messages,
    sessionId,
    isStreaming,
    error,
    sendMessage,
    loadSession,
    startNewSession,
    stopStreaming,
  };
}

export default useAIChat;
