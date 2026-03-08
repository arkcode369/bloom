/**
 * AI Module - Public API
 * Location: src/lib/ai/index.ts
 *
 * Barrel export for the AI service layer.
 *
 * Usage in components:
 *
 *   // React hook (preferred)
 *   import { useAI, AIProvider } from '@/lib/ai';
 *
 *   // Direct service access (outside React)
 *   import { getAIService } from '@/lib/ai';
 *
 *   // Types only
 *   import type { ChatRequest, AISettings } from '@/lib/ai';
 */

// ─── Types ───────────────────────────────────────────
export type {
  // Provider
  AIProviderType,
  AIProviderConfig,
  AIModelInfo,

  // Settings
  AISettings,
  EmbeddingSettings,
  CacheSettings,
  RateLimitSettings,

  // Chat
  ChatRole,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  TokenUsage,

  // Note Context / RAG
  NoteContext,
  EmbeddingRequest,
  EmbeddingResponse,

  // Features
  TagSuggestion,
  NoteSummary,
  LinkSuggestion,
  WritingAssist,

  // Errors
  AIErrorCode,

  // Events
  AIEventType,
  AIEvent,
  AIEventListener,
} from './types';

export { AIError, DEFAULT_AI_SETTINGS, DEFAULT_PROVIDERS } from './types';

// ─── Provider Registry ──────────────────────────────
export { getProviderAdapter, getAllProviderTypes } from './provider-registry';
export type { ProviderAdapter } from './provider-registry';

// ─── Service (singleton) ────────────────────────────
export { getAIService, resetAIService } from './ai-service';
export type { AIService } from './ai-service';

// ─── React Integration ──────────────────────────────
export { AIProvider, useAI } from './useAI';
