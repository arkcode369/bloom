/**
 * AI Service Layer - Type Definitions
 * Location: src/lib/ai/types.ts
 *
 * Core types for the multi-provider AI system.
 * Matches the Rust-side models (src-tauri/src/ai/models.rs) so
 * Tauri command payloads round-trip cleanly.
 */

// ============= Provider Types =============

export type AIProviderType = 'openai' | 'ollama' | 'gemini' | 'anthropic' | 'openrouter';

export interface AIProviderConfig {
  type: AIProviderType;
  label: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  models: AIModelInfo[];
}

export interface AIModelInfo {
  id: string;
  name: string;
  provider: AIProviderType;
  contextWindow: number;
  maxOutput: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  costPer1kInput?: number;   // USD
  costPer1kOutput?: number;  // USD
}

// ============= Settings =============

export interface AISettings {
  enabled: boolean;
  activeProvider: AIProviderType;
  activeModel: string;
  providers: Record<AIProviderType, AIProviderConfig>;
  embeddings: EmbeddingSettings;
  cache: CacheSettings;
  rateLimit: RateLimitSettings;
}

export interface EmbeddingSettings {
  provider: AIProviderType;
  model: string;
  dimensions: number;
  batchSize: number;
  autoIndex: boolean;
}

export interface CacheSettings {
  enabled: boolean;
  ttlMinutes: number;
  maxEntries: number;
}

export interface RateLimitSettings {
  requestsPerMinute: number;
  tokensPerMinute: number;
}

// ============= Chat Types =============

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  noteRefs?: string[];       // note IDs referenced in this message
  timestamp?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  provider?: AIProviderType;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  noteContext?: NoteContext[];
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: AIProviderType;
  usage: TokenUsage;
  finishReason: 'stop' | 'length' | 'error';
  cached: boolean;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ============= Note Context (RAG) =============

export interface NoteContext {
  noteId: string;
  title: string;
  content: string;
  similarity?: number;       // cosine similarity from embedding search
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: { totalTokens: number };
}

// ============= AI Feature Types =============

export interface TagSuggestion {
  name: string;
  confidence: number;
  isExisting: boolean;       // tag already exists in workspace
}

export interface NoteSummary {
  summary: string;
  keyPoints: string[];
  wordCount: number;
}

export interface LinkSuggestion {
  targetNoteId: string;
  targetTitle: string;
  reason: string;
  confidence: number;
}

export interface WritingAssist {
  type: 'continuation' | 'rewrite' | 'expand' | 'simplify' | 'fix_grammar';
  original: string;
  result: string;
  model: string;
}

// ============= Error Types =============

export class AIError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public provider?: AIProviderType,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export type AIErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'CONTEXT_TOO_LONG'
  | 'MODEL_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'STREAM_ERROR'
  | 'CACHE_ERROR'
  | 'EMBEDDING_ERROR'
  | 'UNKNOWN';

// ============= Event Types =============

export type AIEventType =
  | 'stream:start'
  | 'stream:chunk'
  | 'stream:end'
  | 'stream:error'
  | 'cache:hit'
  | 'cache:miss'
  | 'rate:warning'
  | 'rate:blocked';

export interface AIEvent {
  type: AIEventType;
  payload: unknown;
  timestamp: number;
}

export type AIEventListener = (event: AIEvent) => void;

// ============= Default Provider Configs =============

export const DEFAULT_PROVIDERS: Record<AIProviderType, Omit<AIProviderConfig, 'apiKey' | 'enabled'>> = {
  openai: {
    type: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        contextWindow: 128_000,
        maxOutput: 16_384,
        supportsStreaming: true,
        supportsVision: true,
        costPer1kInput: 0.00015,
        costPer1kOutput: 0.0006,
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        contextWindow: 128_000,
        maxOutput: 16_384,
        supportsStreaming: true,
        supportsVision: true,
        costPer1kInput: 0.0025,
        costPer1kOutput: 0.01,
      },
    ],
  },
  ollama: {
    type: 'ollama',
    label: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434',
    models: [
      {
        id: 'llama3.2',
        name: 'Llama 3.2 (3B)',
        provider: 'ollama',
        contextWindow: 128_000,
        maxOutput: 4_096,
        supportsStreaming: true,
        supportsVision: false,
      },
      {
        id: 'mistral',
        name: 'Mistral 7B',
        provider: 'ollama',
        contextWindow: 32_000,
        maxOutput: 4_096,
        supportsStreaming: true,
        supportsVision: false,
      },
      {
        id: 'nomic-embed-text',
        name: 'Nomic Embed Text',
        provider: 'ollama',
        contextWindow: 8_192,
        maxOutput: 0,
        supportsStreaming: false,
        supportsVision: false,
      },
    ],
  },
  gemini: {
    type: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'gemini',
        contextWindow: 1_048_576,
        maxOutput: 8_192,
        supportsStreaming: true,
        supportsVision: true,
        costPer1kInput: 0.0001,
        costPer1kOutput: 0.0004,
      },
    ],
  },
  anthropic: {
    type: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        contextWindow: 200_000,
        maxOutput: 8_192,
        supportsStreaming: true,
        supportsVision: true,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        contextWindow: 200_000,
        maxOutput: 8_192,
        supportsStreaming: true,
        supportsVision: false,
        costPer1kInput: 0.0008,
        costPer1kOutput: 0.004,
      },
    ],
  },
  openrouter: {
    type: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      {
        id: 'meta-llama/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B (via OpenRouter)',
        provider: 'openrouter',
        contextWindow: 128_000,
        maxOutput: 4_096,
        supportsStreaming: true,
        supportsVision: false,
        costPer1kInput: 0.00006,
        costPer1kOutput: 0.00006,
      },
    ],
  },
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  activeProvider: 'openai',
  activeModel: 'gpt-4o-mini',
  providers: {
    openai:     { ...DEFAULT_PROVIDERS.openai,     apiKey: '', enabled: false },
    ollama:     { ...DEFAULT_PROVIDERS.ollama,      apiKey: '', enabled: false },
    gemini:     { ...DEFAULT_PROVIDERS.gemini,      apiKey: '', enabled: false },
    anthropic:  { ...DEFAULT_PROVIDERS.anthropic,   apiKey: '', enabled: false },
    openrouter: { ...DEFAULT_PROVIDERS.openrouter,  apiKey: '', enabled: false },
  },
  embeddings: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 20,
    autoIndex: true,
  },
  cache: {
    enabled: true,
    ttlMinutes: 60,
    maxEntries: 500,
  },
  rateLimit: {
    requestsPerMinute: 20,
    tokensPerMinute: 100_000,
  },
};
