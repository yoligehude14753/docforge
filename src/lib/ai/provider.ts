export interface AIConfig {
  provider: 'openai' | 'deepseek' | 'claude' | 'ollama';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export const DEFAULT_CONFIGS: Record<string, Partial<AIConfig>> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  claude: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  ollama: { baseUrl: 'http://localhost:11434', model: 'qwen2.5:7b' },
};

/** All HTTP calls go through this helper. */
async function aiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, init);
}

function mergeConfig(config: AIConfig): AIConfig {
  const defaults = DEFAULT_CONFIGS[config.provider] ?? {};
  return {
    provider: config.provider,
    apiKey: config.apiKey ?? defaults.apiKey,
    baseUrl: config.baseUrl ?? defaults.baseUrl,
    model: config.model || (defaults.model as string),
    temperature: config.temperature ?? defaults.temperature,
    maxTokens: config.maxTokens ?? defaults.maxTokens,
  };
}

function requireApiKey(config: AIConfig, label: string): string {
  const key = config.apiKey?.trim();
  if (!key) {
    throw new Error(`${label} requires an API key`);
  }
  return key;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t || res.statusText;
  } catch {
    return res.statusText;
  }
}

// --- OpenAI-compatible (OpenAI, DeepSeek) ---

function openAiChatUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, '');
  return `${trimmed}/chat/completions`;
}

async function openAiCompatibleCompletion(
  config: AIConfig,
  messages: ChatMessage[],
  stream: boolean,
): Promise<Response> {
  const apiKey = requireApiKey(config, config.provider);
  const baseUrl =
    config.baseUrl ??
    (config.provider === 'deepseek'
      ? DEFAULT_CONFIGS.deepseek.baseUrl!
      : DEFAULT_CONFIGS.openai.baseUrl!);

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream,
  };
  if (config.temperature !== undefined) body.temperature = config.temperature;
  if (config.maxTokens !== undefined) body.max_tokens = config.maxTokens;

  return aiFetch(openAiChatUrl(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

function extractOpenAiContent(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const choices = (data as { choices?: { message?: { content?: string } }[] }).choices;
  const c0 = choices?.[0];
  return typeof c0?.message?.content === 'string' ? c0.message.content : '';
}

function extractOpenAiDelta(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const choices = (data as { choices?: { delta?: { content?: string } }[] }).choices;
  const d = choices?.[0]?.delta?.content;
  return typeof d === 'string' ? d : '';
}

// --- Claude ---

function claudeMessagesUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, '');
  return `${trimmed}/messages`;
}

function splitClaudeMessages(messages: ChatMessage[]): {
  system: string | undefined;
  claudeMessages: { role: 'user' | 'assistant'; content: string }[];
} {
  const systemParts: string[] = [];
  const claudeMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content);
    } else if (m.role === 'user' || m.role === 'assistant') {
      claudeMessages.push({ role: m.role, content: m.content });
    }
  }
  const system = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
  return { system, claudeMessages };
}

async function claudeCompletion(
  config: AIConfig,
  messages: ChatMessage[],
  stream: boolean,
): Promise<Response> {
  const apiKey = requireApiKey(config, 'Claude');
  const baseUrl = config.baseUrl ?? DEFAULT_CONFIGS.claude.baseUrl!;
  const { system, claudeMessages } = splitClaudeMessages(messages);

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: config.maxTokens ?? 4096,
    messages: claudeMessages,
    stream,
  };
  if (system) body.system = system;
  if (config.temperature !== undefined) body.temperature = config.temperature;

  return aiFetch(claudeMessagesUrl(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
}

function extractClaudeText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const content = (data as { content?: { type?: string; text?: string }[] }).content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('');
}

function extractClaudeStreamDelta(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as {
    type?: string;
    delta?: { text?: string };
  };
  if (d.type === 'content_block_delta' && d.delta && typeof d.delta.text === 'string') {
    return d.delta.text;
  }
  return '';
}

// --- Ollama ---

function ollamaChatUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, '');
  return `${trimmed}/api/chat`;
}

async function ollamaChat(
  config: AIConfig,
  messages: ChatMessage[],
  stream: boolean,
): Promise<Response> {
  const baseUrl = config.baseUrl ?? DEFAULT_CONFIGS.ollama.baseUrl!;
  const options: Record<string, unknown> = {};
  if (config.temperature !== undefined) options.temperature = config.temperature;
  if (config.maxTokens !== undefined) options.num_predict = config.maxTokens;

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream,
  };
  if (Object.keys(options).length > 0) body.options = options;

  return aiFetch(ollamaChatUrl(baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function extractOllamaMessageContent(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const msg = (data as { message?: { content?: string } }).message;
  return typeof msg?.content === 'string' ? msg.content : '';
}

// --- SSE / stream helpers ---

async function* iterateSseLines(body: ReadableStream<Uint8Array> | null): AsyncGenerator<string> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        yield line;
      }
    }
    if (buffer.length > 0) yield buffer.replace(/\r$/, '');
  } finally {
    reader.releaseLock();
  }
}

async function* iterateNdjsonLines(body: ReadableStream<Uint8Array> | null): AsyncGenerator<string> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) yield line;
      }
    }
    const tail = buffer.trim();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

export async function chatCompletion(config: AIConfig, messages: ChatMessage[]): Promise<string> {
  const c = mergeConfig(config);

  if (c.provider === 'openai' || c.provider === 'deepseek') {
    const res = await openAiCompatibleCompletion(c, messages, false);
    if (!res.ok) {
      throw new Error(`OpenAI-compatible API error ${res.status}: ${await readErrorBody(res)}`);
    }
    const data: unknown = await res.json();
    return extractOpenAiContent(data);
  }

  if (c.provider === 'claude') {
    const res = await claudeCompletion(c, messages, false);
    if (!res.ok) {
      throw new Error(`Claude API error ${res.status}: ${await readErrorBody(res)}`);
    }
    const data: unknown = await res.json();
    return extractClaudeText(data);
  }

  if (c.provider === 'ollama') {
    const res = await ollamaChat(c, messages, false);
    if (!res.ok) {
      throw new Error(`Ollama API error ${res.status}: ${await readErrorBody(res)}`);
    }
    const data: unknown = await res.json();
    return extractOllamaMessageContent(data);
  }

  const _exhaustive: never = c.provider;
  return _exhaustive;
}

export async function streamChatCompletion(
  config: AIConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const c = mergeConfig(config);
  let full = '';

  try {
    if (c.provider === 'openai' || c.provider === 'deepseek') {
      const res = await openAiCompatibleCompletion(c, messages, true);
      if (!res.ok) {
        throw new Error(`OpenAI-compatible API error ${res.status}: ${await readErrorBody(res)}`);
      }
      for await (const line of iterateSseLines(res.body)) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') break;
        let data: unknown;
        try {
          data = JSON.parse(payload);
        } catch {
          continue;
        }
        const piece = extractOpenAiDelta(data);
        if (piece) {
          full += piece;
          callbacks.onToken(piece);
        }
      }
      callbacks.onComplete(full);
      return;
    }

    if (c.provider === 'claude') {
      const res = await claudeCompletion(c, messages, true);
      if (!res.ok) {
        throw new Error(`Claude API error ${res.status}: ${await readErrorBody(res)}`);
      }
      for await (const line of iterateSseLines(res.body)) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let data: unknown;
        try {
          data = JSON.parse(payload);
        } catch {
          continue;
        }
        const piece = extractClaudeStreamDelta(data);
        if (piece) {
          full += piece;
          callbacks.onToken(piece);
        }
      }
      callbacks.onComplete(full);
      return;
    }

    if (c.provider === 'ollama') {
      const res = await ollamaChat(c, messages, true);
      if (!res.ok) {
        throw new Error(`Ollama API error ${res.status}: ${await readErrorBody(res)}`);
      }
      let lastContent = '';
      for await (const line of iterateNdjsonLines(res.body)) {
        let data: unknown;
        try {
          data = JSON.parse(line);
        } catch {
          continue;
        }
        const content = extractOllamaMessageContent(data);
        if (content.length >= lastContent.length && content.startsWith(lastContent)) {
          const delta = content.slice(lastContent.length);
          lastContent = content;
          if (delta) {
            full += delta;
            callbacks.onToken(delta);
          }
        } else if (content && content !== lastContent) {
          const delta = content;
          lastContent = content;
          full += delta;
          callbacks.onToken(delta);
        }
      }
      callbacks.onComplete(full);
      return;
    }

    const _exhaustive: never = c.provider;
    void _exhaustive;
  } catch (e) {
    callbacks.onError(e instanceof Error ? e : new Error(String(e)));
  }
}
