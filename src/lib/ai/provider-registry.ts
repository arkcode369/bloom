/**
 * AI Provider Registry
 * Location: src/lib/ai/provider-registry.ts
 *
 * Normalizes every provider (OpenAI, Ollama, Gemini, Anthropic, OpenRouter)
 * into a unified chat/embedding interface. Each provider adapter handles
 * the HTTP format differences so the rest of the app never sees them.
 *
 * Architecture: pure functions + fetch() -- no SDK dependencies.
 * The Tauri Rust backend can optionally proxy requests (for API key safety),
 * but this module also works standalone in the renderer process for Ollama
 * (local, no key needed) and development.
 */

import type {
  AIProviderType,
  AIProviderConfig,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  TokenUsage,
  EmbeddingRequest,
  EmbeddingResponse,
  NoteContext,
  ChatMessage,
} from './types';
import { AIError } from './types';

// ============= Provider Interface =============

export interface ProviderAdapter {
  readonly type: AIProviderType;

  /** One-shot completion */
  chat(config: AIProviderConfig, request: ChatRequest): Promise<ChatResponse>;

  /** Streaming completion -- yields chunks via callback */
  chatStream(
    config: AIProviderConfig,
    request: ChatRequest,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<ChatResponse>;

  /** Generate embeddings (not all providers support this) */
  embed(config: AIProviderConfig, request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /** Quick connectivity / key check */
  healthCheck(config: AIProviderConfig): Promise<boolean>;
}

// ============= Helpers =============

function buildSystemPrompt(request: ChatRequest): string {
  const parts: string[] = [];

  if (request.systemPrompt) {
    parts.push(request.systemPrompt);
  } else {
    parts.push(
      'You are a helpful AI assistant integrated into Bloom, a personal knowledge management app. ' +
      'The user writes notes with bidirectional links ([[wikilinks]]). ' +
      'Be concise and reference note titles when relevant.',
    );
  }

  if (request.noteContext?.length) {
    parts.push('\n--- Referenced Notes ---');
    request.noteContext.forEach((ctx: NoteContext) => {
      const snippet = ctx.content.slice(0, 1500);
      parts.push(`\n[[${ctx.title}]] (similarity ${(ctx.similarity ?? 0).toFixed(2)}):\n${snippet}`);
    });
  }

  return parts.join('\n');
}

function toOpenAIMessages(request: ChatRequest): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: buildSystemPrompt(request) },
  ];
  for (const m of request.messages) {
    messages.push({ role: m.role, content: m.content });
  }
  return messages;
}

/** Parse an SSE stream line-by-line */
async function* iterSSE(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        yield data;
      }
    }
  }
}

function emptyUsage(): TokenUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

// ============= OpenAI-Compatible Adapter =============
// Works for: OpenAI, OpenRouter, and any OpenAI-compatible endpoint

function createOpenAIAdapter(providerType: AIProviderType): ProviderAdapter {
  const headers = (config: AIProviderConfig): Record<string, string> => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      h['Authorization'] = `Bearer ${config.apiKey}`;
    }
    // OpenRouter-specific headers
    if (providerType === 'openrouter') {
      h['HTTP-Referer'] = 'https://bloom-notes.app';
      h['X-Title'] = 'Bloom Notes';
    }
    return h;
  };

  return {
    type: providerType,

    async chat(config, request): Promise<ChatResponse> {
      const model = request.model ?? config.models[0]?.id;
      const body = {
        model,
        messages: toOpenAIMessages(request),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
        stream: false,
      };

      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: headers(config),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) throw new AIError('Invalid API key', 'INVALID_API_KEY', providerType);
        if (res.status === 429) throw new AIError('Rate limited', 'RATE_LIMITED', providerType, true);
        throw new AIError(`${providerType} error ${res.status}: ${err}`, 'NETWORK_ERROR', providerType, true);
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const usage: TokenUsage = {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      };

      return {
        content: choice?.message?.content ?? '',
        model: data.model ?? model,
        provider: providerType,
        usage,
        finishReason: choice?.finish_reason === 'length' ? 'length' : 'stop',
        cached: false,
      };
    },

    async chatStream(config, request, onChunk): Promise<ChatResponse> {
      const model = request.model ?? config.models[0]?.id;
      const body = {
        model,
        messages: toOpenAIMessages(request),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
        stream: true,
        stream_options: { include_usage: true },
      };

      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: headers(config),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new AIError(`Stream error ${res.status}: ${err}`, 'STREAM_ERROR', providerType, true);
      }

      const reader = res.body!.getReader();
      let fullContent = '';
      let usage = emptyUsage();
      let finishReason: 'stop' | 'length' | 'error' = 'stop';

      for await (const jsonStr of iterSSE(reader)) {
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          const done = parsed.choices?.[0]?.finish_reason != null;

          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens ?? 0,
              completionTokens: parsed.usage.completion_tokens ?? 0,
              totalTokens: parsed.usage.total_tokens ?? 0,
            };
          }

          if (delta) {
            fullContent += delta;
            onChunk({ delta, done: false });
          }
          if (done) {
            finishReason = parsed.choices[0].finish_reason === 'length' ? 'length' : 'stop';
            onChunk({ delta: '', done: true, usage });
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }

      return {
        content: fullContent,
        model: model!,
        provider: providerType,
        usage,
        finishReason,
        cached: false,
      };
    },

    async embed(config, request): Promise<EmbeddingResponse> {
      const model = request.model ?? 'text-embedding-3-small';

      const res = await fetch(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: headers(config),
        body: JSON.stringify({ model, input: request.texts }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new AIError(`Embedding error: ${err}`, 'EMBEDDING_ERROR', providerType);
      }

      const data = await res.json();
      return {
        embeddings: data.data.map((d: { embedding: number[] }) => d.embedding),
        model: data.model ?? model,
        usage: { totalTokens: data.usage?.total_tokens ?? 0 },
      };
    },

    async healthCheck(config): Promise<boolean> {
      try {
        const res = await fetch(`${config.baseUrl}/models`, {
          headers: headers(config),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

// ============= Ollama Adapter =============

const ollamaAdapter: ProviderAdapter = {
  type: 'ollama',

  async chat(config, request): Promise<ChatResponse> {
    const model = request.model ?? config.models[0]?.id ?? 'llama3.2';

    const res = await fetch(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: toOpenAIMessages(request),
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 2048,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AIError(`Ollama error: ${err}`, 'NETWORK_ERROR', 'ollama', true);
    }

    const data = await res.json();
    return {
      content: data.message?.content ?? '',
      model: data.model ?? model,
      provider: 'ollama',
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
      finishReason: data.done ? 'stop' : 'length',
      cached: false,
    };
  },

  async chatStream(config, request, onChunk): Promise<ChatResponse> {
    const model = request.model ?? config.models[0]?.id ?? 'llama3.2';

    const res = await fetch(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: toOpenAIMessages(request),
        stream: true,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 2048,
        },
      }),
    });

    if (!res.ok) {
      throw new AIError('Ollama stream error', 'STREAM_ERROR', 'ollama', true);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let usage = emptyUsage();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const delta = parsed.message?.content ?? '';
          if (delta) {
            fullContent += delta;
            onChunk({ delta, done: false });
          }
          if (parsed.done) {
            usage = {
              promptTokens: parsed.prompt_eval_count ?? 0,
              completionTokens: parsed.eval_count ?? 0,
              totalTokens: (parsed.prompt_eval_count ?? 0) + (parsed.eval_count ?? 0),
            };
            onChunk({ delta: '', done: true, usage });
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    return {
      content: fullContent,
      model,
      provider: 'ollama',
      usage,
      finishReason: 'stop',
      cached: false,
    };
  },

  async embed(config, request): Promise<EmbeddingResponse> {
    const model = request.model ?? 'nomic-embed-text';
    const embeddings: number[][] = [];
    let totalTokens = 0;

    // Ollama embeds one text at a time
    for (const text of request.texts) {
      const res = await fetch(`${config.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: text }),
      });
      if (!res.ok) throw new AIError('Ollama embed error', 'EMBEDDING_ERROR', 'ollama');
      const data = await res.json();
      embeddings.push(data.embeddings?.[0] ?? data.embedding ?? []);
      totalTokens += text.split(/\s+/).length; // approximate
    }

    return { embeddings, model, usage: { totalTokens } };
  },

  async healthCheck(config): Promise<boolean> {
    try {
      const res = await fetch(`${config.baseUrl}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  },
};

// ============= Gemini Adapter =============

const geminiAdapter: ProviderAdapter = {
  type: 'gemini',

  async chat(config, request): Promise<ChatResponse> {
    const model = request.model ?? config.models[0]?.id ?? 'gemini-2.0-flash';
    const url = `${config.baseUrl}/models/${model}:generateContent?key=${config.apiKey}`;

    // Convert to Gemini format
    const contents = request.messages.map((m: ChatMessage) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Prepend system as a user turn (Gemini uses systemInstruction separately)
    const systemText = buildSystemPrompt(request);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 2048,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (res.status === 400 && err.includes('API_KEY')) {
        throw new AIError('Invalid Gemini API key', 'INVALID_API_KEY', 'gemini');
      }
      throw new AIError(`Gemini error: ${err}`, 'NETWORK_ERROR', 'gemini', true);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const usageData = data.usageMetadata ?? {};

    return {
      content: text,
      model,
      provider: 'gemini',
      usage: {
        promptTokens: usageData.promptTokenCount ?? 0,
        completionTokens: usageData.candidatesTokenCount ?? 0,
        totalTokens: usageData.totalTokenCount ?? 0,
      },
      finishReason: 'stop',
      cached: false,
    };
  },

  async chatStream(config, request, onChunk): Promise<ChatResponse> {
    const model = request.model ?? config.models[0]?.id ?? 'gemini-2.0-flash';
    const url = `${config.baseUrl}/models/${model}:streamGenerateContent?key=${config.apiKey}&alt=sse`;

    const contents = request.messages.map((m: ChatMessage) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const systemText = buildSystemPrompt(request);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 2048,
        },
      }),
    });

    if (!res.ok) {
      throw new AIError('Gemini stream error', 'STREAM_ERROR', 'gemini', true);
    }

    const reader = res.body!.getReader();
    let fullContent = '';
    let usage = emptyUsage();

    for await (const jsonStr of iterSSE(reader)) {
      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (delta) {
          fullContent += delta;
          onChunk({ delta, done: false });
        }
        if (parsed.usageMetadata) {
          usage = {
            promptTokens: parsed.usageMetadata.promptTokenCount ?? 0,
            completionTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: parsed.usageMetadata.totalTokenCount ?? 0,
          };
        }
      } catch {
        // Skip malformed chunks
      }
    }

    onChunk({ delta: '', done: true, usage });
    return { content: fullContent, model, provider: 'gemini', usage, finishReason: 'stop', cached: false };
  },

  async embed(config, request): Promise<EmbeddingResponse> {
    const model = request.model ?? 'text-embedding-004';
    const url = `${config.baseUrl}/models/${model}:batchEmbedContents?key=${config.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: request.texts.map(text => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        })),
      }),
    });

    if (!res.ok) throw new AIError('Gemini embed error', 'EMBEDDING_ERROR', 'gemini');
    const data = await res.json();
    return {
      embeddings: data.embeddings.map((e: { values: number[] }) => e.values),
      model,
      usage: { totalTokens: 0 },
    };
  },

  async healthCheck(config): Promise<boolean> {
    try {
      const res = await fetch(`${config.baseUrl}/models?key=${config.apiKey}`);
      return res.ok;
    } catch {
      return false;
    }
  },
};

// ============= Anthropic Adapter =============

const anthropicAdapter: ProviderAdapter = {
  type: 'anthropic',

  async chat(config, request): Promise<ChatResponse> {
    const model = request.model ?? config.models[0]?.id;
    const systemText = buildSystemPrompt(request);

    // Anthropic uses a different message format
    const messages = request.messages.map((m: ChatMessage) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    }));

    const res = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        system: systemText,
        messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (res.status === 401) throw new AIError('Invalid Anthropic key', 'INVALID_API_KEY', 'anthropic');
      if (res.status === 429) throw new AIError('Rate limited', 'RATE_LIMITED', 'anthropic', true);
      throw new AIError(`Anthropic error: ${err}`, 'NETWORK_ERROR', 'anthropic', true);
    }

    const data = await res.json();
    const content = data.content?.[0]?.text ?? '';

    return {
      content,
      model: data.model ?? model!,
      provider: 'anthropic',
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      finishReason: data.stop_reason === 'max_tokens' ? 'length' : 'stop',
      cached: false,
    };
  },

  async chatStream(config, request, onChunk): Promise<ChatResponse> {
    const model = request.model ?? config.models[0]?.id;
    const systemText = buildSystemPrompt(request);
    const messages = request.messages.map((m: ChatMessage) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    }));

    const res = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        system: systemText,
        messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new AIError('Anthropic stream error', 'STREAM_ERROR', 'anthropic', true);
    }

    const reader = res.body!.getReader();
    let fullContent = '';
    let usage = emptyUsage();

    for await (const jsonStr of iterSSE(reader)) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'content_block_delta') {
          const delta = parsed.delta?.text ?? '';
          if (delta) {
            fullContent += delta;
            onChunk({ delta, done: false });
          }
        }
        if (parsed.type === 'message_delta') {
          usage = {
            promptTokens: parsed.usage?.input_tokens ?? usage.promptTokens,
            completionTokens: parsed.usage?.output_tokens ?? usage.completionTokens,
            totalTokens: 0,
          };
          usage.totalTokens = usage.promptTokens + usage.completionTokens;
        }
        if (parsed.type === 'message_stop') {
          onChunk({ delta: '', done: true, usage });
        }
      } catch {
        // Skip malformed chunks
      }
    }

    return { content: fullContent, model: model!, provider: 'anthropic', usage, finishReason: 'stop', cached: false };
  },

  async embed(): Promise<EmbeddingResponse> {
    throw new AIError(
      'Anthropic does not support embeddings. Use OpenAI or Ollama for embeddings.',
      'EMBEDDING_ERROR',
      'anthropic',
    );
  },

  async healthCheck(config): Promise<boolean> {
    try {
      // Anthropic has no /models endpoint -- send a tiny request
      const res = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};

// ============= Registry =============

const adapters: Record<AIProviderType, ProviderAdapter> = {
  openai: createOpenAIAdapter('openai'),
  ollama: ollamaAdapter,
  gemini: geminiAdapter,
  anthropic: anthropicAdapter,
  openrouter: createOpenAIAdapter('openrouter'),
};

export function getProviderAdapter(type: AIProviderType): ProviderAdapter {
  const adapter = adapters[type];
  if (!adapter) {
    throw new AIError(`Unknown provider: ${type}`, 'PROVIDER_NOT_CONFIGURED', type);
  }
  return adapter;
}

export function getAllProviderTypes(): AIProviderType[] {
  return Object.keys(adapters) as AIProviderType[];
}
