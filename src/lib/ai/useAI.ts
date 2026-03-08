/**
 * useAI - React Hook for AI Service
 * Location: src/lib/ai/useAI.ts
 *
 * Provides reactive access to the AI service singleton.
 * Follows the same context-provider pattern as usePreferences / useWritingStats.
 *
 * Usage:
 *   const { chat, chatStream, isStreaming, streamContent, settings, ... } = useAI();
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react';
import type {
  AISettings,
  AIProviderType,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  TagSuggestion,
  NoteSummary,
  LinkSuggestion,
  WritingAssist,
  AIEvent,
} from './types';
import { getAIService, type AIService } from './ai-service';

// ============= Context Shape =============

interface AIContextValue {
  /** Full settings object */
  settings: AISettings;
  /** Whether AI is globally enabled */
  isEnabled: boolean;
  /** Whether a streaming response is in progress */
  isStreaming: boolean;
  /** Whether any AI request is loading */
  isLoading: boolean;
  /** Accumulated streaming content (resets on new stream) */
  streamContent: string;
  /** Last error from any AI operation */
  error: string | null;

  // ─── Settings ──────────────────────────────
  updateSettings: (partial: Partial<AISettings>) => void;
  updateProviderConfig: (
    type: AIProviderType,
    updates: { apiKey?: string; baseUrl?: string; enabled?: boolean },
  ) => void;

  // ─── Core Chat ─────────────────────────────
  chat: (request: ChatRequest) => Promise<ChatResponse | null>;
  chatStream: (request: ChatRequest) => Promise<ChatResponse | null>;
  /** Abort an in-progress stream */
  abortStream: () => void;

  // ─── High-Level Features ───────────────────
  suggestTags: (title: string, content: string, existingTags: string[]) => Promise<TagSuggestion[]>;
  summariseNote: (title: string, content: string) => Promise<NoteSummary | null>;
  suggestLinks: (
    title: string,
    content: string,
    allNotes: Array<{ id: string; title: string }>,
  ) => Promise<LinkSuggestion[]>;
  writingAssist: (type: WritingAssist['type'], text: string) => Promise<WritingAssist | null>;

  // ─── Utility ───────────────────────────────
  healthCheck: (provider?: AIProviderType) => Promise<boolean>;
  clearCache: () => void;
  clearError: () => void;
  rateLimitStats: { requestsThisMinute: number; tokensThisMinute: number; requestLimit: number; tokenLimit: number };
}

const AIContext = createContext<AIContextValue | undefined>(undefined);

// ============= Provider =============

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const serviceRef = useRef<AIService>(getAIService());
  const abortRef = useRef(false);

  const [settings, setSettings] = useState<AISettings>(() => serviceRef.current.getSettings());
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Subscribe to AI events for debugging / telemetry
  useEffect(() => {
    const service = serviceRef.current;
    const unsub = service.on('*', (event: AIEvent) => {
      if (event.type === 'stream:error') {
        const payload = event.payload as { error?: { message?: string } };
        setError(payload?.error?.message ?? 'Stream error');
      }
    });
    return unsub;
  }, []);

  // ─── Settings ──────────────────────────────

  const updateSettings = useCallback((partial: Partial<AISettings>) => {
    const updated = serviceRef.current.updateSettings(partial);
    setSettings(updated);
  }, []);

  const updateProviderConfig = useCallback((
    type: AIProviderType,
    updates: { apiKey?: string; baseUrl?: string; enabled?: boolean },
  ) => {
    serviceRef.current.updateProviderConfig(type, updates);
    setSettings(serviceRef.current.getSettings());
  }, []);

  // ─── Core Chat ─────────────────────────────

  const chat = useCallback(async (request: ChatRequest): Promise<ChatResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await serviceRef.current.chat(request);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const chatStream = useCallback(async (request: ChatRequest): Promise<ChatResponse | null> => {
    setIsStreaming(true);
    setIsLoading(true);
    setStreamContent('');
    setError(null);
    abortRef.current = false;

    try {
      const response = await serviceRef.current.chatStream(
        request,
        (chunk: StreamChunk) => {
          if (abortRef.current) return;
          if (!chunk.done) {
            setStreamContent(prev => prev + chunk.delta);
          }
        },
      );
      return response;
    } catch (err: unknown) {
      if (!abortRef.current) {
        const message = err instanceof Error ? err.message : 'Stream error';
        setError(message);
      }
      return null;
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  const abortStream = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  // ─── High-Level Features ───────────────────

  const suggestTags = useCallback(async (
    title: string, content: string, existingTags: string[],
  ): Promise<TagSuggestion[]> => {
    setIsLoading(true);
    setError(null);
    try {
      return await serviceRef.current.suggestTags(title, content, existingTags);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Tag suggestion failed';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const summariseNote = useCallback(async (
    title: string, content: string,
  ): Promise<NoteSummary | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await serviceRef.current.summariseNote(title, content);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Summarisation failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const suggestLinks = useCallback(async (
    title: string,
    content: string,
    allNotes: Array<{ id: string; title: string }>,
  ): Promise<LinkSuggestion[]> => {
    setIsLoading(true);
    setError(null);
    try {
      return await serviceRef.current.suggestLinks(title, content, allNotes);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Link suggestion failed';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const writingAssist = useCallback(async (
    type: WritingAssist['type'], text: string,
  ): Promise<WritingAssist | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await serviceRef.current.writingAssist(type, text);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Writing assist failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Utility ───────────────────────────────

  const healthCheck = useCallback(async (provider?: AIProviderType): Promise<boolean> => {
    try {
      return await serviceRef.current.healthCheck(provider);
    } catch {
      return false;
    }
  }, []);

  const clearCache = useCallback(() => {
    serviceRef.current.clearCache();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const rateLimitStats = useMemo(() => serviceRef.current.rateLimitStats, [isLoading]);

  // ─── Context Value ─────────────────────────

  const value = useMemo<AIContextValue>(() => ({
    settings,
    isEnabled: settings.enabled,
    isStreaming,
    isLoading,
    streamContent,
    error,
    updateSettings,
    updateProviderConfig,
    chat,
    chatStream,
    abortStream,
    suggestTags,
    summariseNote,
    suggestLinks,
    writingAssist,
    healthCheck,
    clearCache,
    clearError,
    rateLimitStats,
  }), [
    settings, isStreaming, isLoading, streamContent, error,
    updateSettings, updateProviderConfig, chat, chatStream, abortStream,
    suggestTags, summariseNote, suggestLinks, writingAssist,
    healthCheck, clearCache, clearError, rateLimitStats,
  ]);

  return React.createElement(AIContext.Provider, { value }, children);
}

// ============= Hook =============

export function useAI(): AIContextValue {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
