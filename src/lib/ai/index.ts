/**
 * AI Module — Barrel Exports
 * src/lib/ai/index.ts
 */
export type {
  AISettings,
  AIProviderType,
  AIProviderConfig,
  AIModel,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  TagSuggestion,
  NoteSummary,
  LinkSuggestion,
  WritingAssist,
  AIEvent,
  EmbeddingResult,
} from './types';

export { getAIService, type AIService } from './ai-service';
export { AIProvider, useAI } from './useAI';
