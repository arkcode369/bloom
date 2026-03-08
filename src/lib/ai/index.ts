/**
 * AI Module - Barrel Exports
 * 
 * Central export point for Bloom's AI integration layer.
 * Re-exports all public APIs from the AI service foundation.
 */

export { AIService } from './ai-service';
export { ProviderRegistry } from './provider-registry';
export type {
  AIProvider,
  AIProviderConfig,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  AIError,
  AIErrorCode,
  AIServiceConfig,
  AIServiceEvents,
} from './types';
