/**
 * AI Service - Core Orchestration Layer
 * Location: src/lib/ai/ai-service.ts
 *
 * Singleton service that sits between React hooks and provider adapters.
 * Handles: settings persistence, response caching, rate limiting,
 * event bus, and high-level AI features (summarise, suggest tags, etc.).
 *
 * Follows the same localStorage pattern as usePreferences.
 */

import type {
  AISettings,
  AIProviderType,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  TokenUsage,
  EmbeddingRequest,
  EmbeddingResponse,
  NoteContext,
  TagSuggestion,
  NoteSummary,
  LinkSuggestion,
  WritingAssist,
  AIEvent,
  AIEventListener,
  AIEventType,
} from './types';
import { AIError, DEFAULT_AI_SETTINGS } from './types';
import { getProviderAdapter } from './provider-registry';

// ============= Response Cache =============

interface CacheEntry {
  response: ChatResponse;
  expiresAt: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(maxEntries = 500, ttlMinutes = 60) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  private hash(request: ChatRequest): string {
    const key = JSON.stringify({
      messages: request.messages.map(m => `${m.role}:${m.content}`),
      model: request.model,
      provider: request.provider,
      temperature: request.temperature,
    });
    // Simple djb2 hash
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
  }

  get(request: ChatRequest): ChatResponse | null {
    const key = this.hash(request);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return { ...entry.response, cached: true };
  }

  set(request: ChatRequest, response: ChatResponse): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    const key = this.hash(request);
    this.cache.set(key, {
      response,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  updateConfig(maxEntries: number, ttlMinutes: number): void {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }
}

// ============= Rate Limiter =============

class RateLimiter {
  private requestTimestamps: number[] = [];
  private tokenCounts: Array<{ tokens: number; timestamp: number }> = [];
  private requestsPerMinute: number;
  private tokensPerMinute: number;

  constructor(requestsPerMinute = 20, tokensPerMinute = 100_000) {
    this.requestsPerMinute = requestsPerMinute;
    this.tokensPerMinute = tokensPerMinute;
  }

  canProceed(): { allowed: boolean; retryAfterMs?: number; reason?: string } {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    // Clean old entries
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);
    this.tokenCounts = this.tokenCounts.filter(t => t.timestamp > oneMinuteAgo);

    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldestRelevant = this.requestTimestamps[0];
      return {
        allowed: false,
        retryAfterMs: oldestRelevant + 60_000 - now,
        reason: `Rate limit: ${this.requestsPerMinute} requests/min exceeded`,
      };
    }

    const totalTokens = this.tokenCounts.reduce((sum, t) => sum + t.tokens, 0);
    if (totalTokens >= this.tokensPerMinute) {
      const oldestRelevant = this.tokenCounts[0].timestamp;
      return {
        allowed: false,
        retryAfterMs: oldestRelevant + 60_000 - now,
        reason: `Token limit: ${this.tokensPerMinute} tokens/min exceeded`,
      };
    }

    return { allowed: true };
  }

  recordRequest(tokenCount: number = 0): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    if (tokenCount > 0) {
      this.tokenCounts.push({ tokens: tokenCount, timestamp: now });
    }
  }

  updateConfig(requestsPerMinute: number, tokensPerMinute: number): void {
    this.requestsPerMinute = requestsPerMinute;
    this.tokensPerMinute = tokensPerMinute;
  }

  get stats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const recentRequests = this.requestTimestamps.filter(t => t > oneMinuteAgo).length;
    const recentTokens = this.tokenCounts
      .filter(t => t.timestamp > oneMinuteAgo)
      .reduce((sum, t) => sum + t.tokens, 0);
    return {
      requestsThisMinute: recentRequests,
      tokensThisMinute: recentTokens,
      requestLimit: this.requestsPerMinute,
      tokenLimit: this.tokensPerMinute,
    };
  }
}

// ============= Event Bus =============

class AIEventBus {
  private listeners = new Map<AIEventType | '*', Set<AIEventListener>>();

  on(type: AIEventType | '*', listener: AIEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  emit(type: AIEventType, payload: unknown = null): void {
    const event: AIEvent = { type, payload, timestamp: Date.now() };
    this.listeners.get(type)?.forEach(fn => fn(event));
    this.listeners.get('*')?.forEach(fn => fn(event));
  }
}

// ============= Main AI Service =============

const SETTINGS_KEY = 'bloom-ai-settings';

class AIService {
  private settings: AISettings;
  private cache: ResponseCache;
  private rateLimiter: RateLimiter;
  private events: AIEventBus;

  constructor() {
    this.settings = this.loadSettings();
    this.cache = new ResponseCache(
      this.settings.cache.maxEntries,
      this.settings.cache.ttlMinutes,
    );
    this.rateLimiter = new RateLimiter(
      this.settings.rateLimit.requestsPerMinute,
      this.settings.rateLimit.tokensPerMinute,
    );
    this.events = new AIEventBus();
  }

  // ─── Settings ──────────────────────────────────────

  private loadSettings(): AISettings {
    if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS;
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Corrupted settings -- reset
    }
    return DEFAULT_AI_SETTINGS;
  }

  private persistSettings(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  getSettings(): AISettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AISettings>): AISettings {
    this.settings = { ...this.settings, ...partial };

    // Propagate config changes to sub-systems
    if (partial.cache) {
      this.cache.updateConfig(
        this.settings.cache.maxEntries,
        this.settings.cache.ttlMinutes,
      );
    }
    if (partial.rateLimit) {
      this.rateLimiter.updateConfig(
        this.settings.rateLimit.requestsPerMinute,
        this.settings.rateLimit.tokensPerMinute,
      );
    }

    this.persistSettings();
    return this.getSettings();
  }

  updateProviderConfig(
    type: AIProviderType,
    updates: { apiKey?: string; baseUrl?: string; enabled?: boolean },
  ): void {
    const current = this.settings.providers[type];
    this.settings.providers[type] = { ...current, ...updates };
    this.persistSettings();
  }

  get isEnabled(): boolean {
    return this.settings.enabled;
  }

  // ─── Event Bus ─────────────────────────────────────

  on(type: AIEventType | '*', listener: AIEventListener): () => void {
    return this.events.on(type, listener);
  }

  // ─── Core Chat ─────────────────────────────────────

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.ensureEnabled();

    const provider = request.provider ?? this.settings.activeProvider;
    const config = this.settings.providers[provider];
    this.ensureProviderConfigured(provider, config);

    // Check cache first (skip for streaming)
    if (this.settings.cache.enabled && !request.stream) {
      const cached = this.cache.get(request);
      if (cached) {
        this.events.emit('cache:hit', { provider });
        return cached;
      }
      this.events.emit('cache:miss', { provider });
    }

    // Rate limit check
    const rateCheck = this.rateLimiter.canProceed();
    if (!rateCheck.allowed) {
      this.events.emit('rate:blocked', rateCheck);
      throw new AIError(
        rateCheck.reason ?? 'Rate limited',
        'RATE_LIMITED',
        provider,
        true,
      );
    }

    const adapter = getProviderAdapter(provider);
    const enrichedRequest: ChatRequest = {
      ...request,
      model: request.model ?? this.settings.activeModel,
      provider,
    };

    const response = await adapter.chat(config, enrichedRequest);

    // Record usage
    this.rateLimiter.recordRequest(response.usage.totalTokens);

    // Cache the response
    if (this.settings.cache.enabled) {
      this.cache.set(request, response);
    }

    return response;
  }

  async chatStream(
    request: ChatRequest,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<ChatResponse> {
    this.ensureEnabled();

    const provider = request.provider ?? this.settings.activeProvider;
    const config = this.settings.providers[provider];
    this.ensureProviderConfigured(provider, config);

    const rateCheck = this.rateLimiter.canProceed();
    if (!rateCheck.allowed) {
      this.events.emit('rate:blocked', rateCheck);
      throw new AIError(
        rateCheck.reason ?? 'Rate limited',
        'RATE_LIMITED',
        provider,
        true,
      );
    }

    const adapter = getProviderAdapter(provider);
    const enrichedRequest: ChatRequest = {
      ...request,
      model: request.model ?? this.settings.activeModel,
      provider,
    };

    this.events.emit('stream:start', { provider, model: enrichedRequest.model });

    try {
      const response = await adapter.chatStream(config, enrichedRequest, (chunk) => {
        this.events.emit('stream:chunk', chunk);
        onChunk(chunk);
      });

      this.rateLimiter.recordRequest(response.usage.totalTokens);
      this.events.emit('stream:end', { provider, usage: response.usage });
      return response;
    } catch (err) {
      this.events.emit('stream:error', { provider, error: err });
      throw err;
    }
  }

  // ─── Embeddings ────────────────────────────────────

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    this.ensureEnabled();

    const provider = this.settings.embeddings.provider;
    const config = this.settings.providers[provider];
    this.ensureProviderConfigured(provider, config);

    const adapter = getProviderAdapter(provider);
    const enrichedRequest: EmbeddingRequest = {
      ...request,
      model: request.model ?? this.settings.embeddings.model,
    };

    return adapter.embed(config, enrichedRequest);
  }

  /** Embed texts in batches (respects embeddings.batchSize) */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const batchSize = this.settings.embeddings.batchSize;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.embed({ texts: batch });
      allEmbeddings.push(...response.embeddings);
    }

    return allEmbeddings;
  }

  // ─── Health Check ──────────────────────────────────

  async healthCheck(provider?: AIProviderType): Promise<boolean> {
    const type = provider ?? this.settings.activeProvider;
    const config = this.settings.providers[type];
    if (!config.enabled) return false;

    const adapter = getProviderAdapter(type);
    return adapter.healthCheck(config);
  }

  // ─── High-Level Features ───────────────────────────

  async suggestTags(
    noteTitle: string,
    noteContent: string,
    existingTags: string[],
  ): Promise<TagSuggestion[]> {
    const response = await this.chat({
      messages: [{
        role: 'user',
        content: `Suggest 3-5 tags for this note. Return ONLY a JSON array like [{"name":"tag","confidence":0.9}].

Existing tags in workspace: ${existingTags.join(', ') || 'none'}

Note title: ${noteTitle}
Note content (first 2000 chars):
${noteContent.slice(0, 2000)}`,
      }],
      temperature: 0.3,
      maxTokens: 300,
      systemPrompt: 'You are a tagging assistant. Return only valid JSON, no markdown.',
    });

    try {
      const parsed = JSON.parse(response.content);
      return (parsed as Array<{ name: string; confidence: number }>).map(t => ({
        name: t.name.toLowerCase().trim(),
        confidence: t.confidence ?? 0.5,
        isExisting: existingTags.some(et => et.toLowerCase() === t.name.toLowerCase().trim()),
      }));
    } catch {
      return [];
    }
  }

  async summariseNote(title: string, content: string): Promise<NoteSummary> {
    const response = await this.chat({
      messages: [{
        role: 'user',
        content: `Summarise this note concisely. Return JSON: {"summary":"...","keyPoints":["..."],"wordCount":N}

Title: ${title}
Content:
${content.slice(0, 4000)}`,
      }],
      temperature: 0.3,
      maxTokens: 500,
      systemPrompt: 'You are a summarisation assistant. Return only valid JSON.',
    });

    try {
      return JSON.parse(response.content) as NoteSummary;
    } catch {
      return { summary: response.content, keyPoints: [], wordCount: content.split(/\s+/).length };
    }
  }

  async suggestLinks(
    noteTitle: string,
    noteContent: string,
    allNoteTitles: Array<{ id: string; title: string }>,
  ): Promise<LinkSuggestion[]> {
    const titlesStr = allNoteTitles
      .slice(0, 100) // limit to prevent token overflow
      .map(n => `- ${n.title} (id:${n.id})`)
      .join('\n');

    const response = await this.chat({
      messages: [{
        role: 'user',
        content: `Given this note, suggest 1-5 other notes it should link to.
Return JSON array: [{"targetNoteId":"...","targetTitle":"...","reason":"...","confidence":0.8}]

Current note: ${noteTitle}
Content (first 2000 chars):
${noteContent.slice(0, 2000)}

Available notes:
${titlesStr}`,
      }],
      temperature: 0.3,
      maxTokens: 500,
      systemPrompt: 'You are a knowledge graph assistant. Return only valid JSON.',
    });

    try {
      return JSON.parse(response.content) as LinkSuggestion[];
    } catch {
      return [];
    }
  }

  async writingAssist(
    type: WritingAssist['type'],
    text: string,
  ): Promise<WritingAssist> {
    const prompts: Record<WritingAssist['type'], string> = {
      continuation: `Continue writing from where this text leaves off. Write 2-3 natural paragraphs:\n\n${text}`,
      rewrite: `Rewrite this text to be clearer and more concise, preserving the meaning:\n\n${text}`,
      expand: `Expand on this text with more detail and examples:\n\n${text}`,
      simplify: `Simplify this text so it's easier to understand:\n\n${text}`,
      fix_grammar: `Fix grammar and spelling errors in this text. Only fix errors, don't change the style:\n\n${text}`,
    };

    const response = await this.chat({
      messages: [{ role: 'user', content: prompts[type] }],
      temperature: type === 'fix_grammar' ? 0.1 : 0.7,
      maxTokens: 1500,
      systemPrompt: 'You are a writing assistant. Return only the improved text, no explanations.',
    });

    return {
      type,
      original: text,
      result: response.content,
      model: response.model,
    };
  }

  // ─── Utility ───────────────────────────────────────

  clearCache(): void {
    this.cache.clear();
  }

  get cacheStats() {
    return { entries: this.cache.size };
  }

  get rateLimitStats() {
    return this.rateLimiter.stats;
  }

  getActiveModel() {
    const provider = this.settings.activeProvider;
    const config = this.settings.providers[provider];
    return config.models.find(m => m.id === this.settings.activeModel) ?? config.models[0] ?? null;
  }

  getAvailableModels(provider?: AIProviderType) {
    const type = provider ?? this.settings.activeProvider;
    return this.settings.providers[type]?.models ?? [];
  }

  // ─── Guards ────────────────────────────────────────

  private ensureEnabled(): void {
    if (!this.settings.enabled) {
      throw new AIError(
        'AI features are disabled. Enable them in Settings > AI.',
        'PROVIDER_NOT_CONFIGURED',
      );
    }
  }

  private ensureProviderConfigured(
    type: AIProviderType,
    config: { enabled: boolean; apiKey: string },
  ): void {
    if (!config.enabled) {
      throw new AIError(
        `Provider "${type}" is not enabled`,
        'PROVIDER_NOT_CONFIGURED',
        type,
      );
    }
    // Ollama doesn't need an API key
    if (type !== 'ollama' && !config.apiKey) {
      throw new AIError(
        `No API key configured for ${type}`,
        'INVALID_API_KEY',
        type,
      );
    }
  }
}

// ============= Singleton Export =============

let _instance: AIService | null = null;

export function getAIService(): AIService {
  if (!_instance) {
    _instance = new AIService();
  }
  return _instance;
}

/** Reset singleton (useful for tests) */
export function resetAIService(): void {
  _instance = null;
}

export type { AIService };
