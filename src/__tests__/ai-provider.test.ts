import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatCompletion } from '@/lib/ai/provider';
import type { AIConfig, ChatMessage } from '@/lib/ai/provider';

const messages: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Say hello.' },
];

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response);
}

describe('chatCompletion', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call OpenAI-compatible endpoint for openai provider', async () => {
    const responseBody = {
      choices: [{ message: { content: 'Hello!' } }],
    };
    vi.stubGlobal('fetch', mockFetchResponse(responseBody));

    const config: AIConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com/v1',
    };
    const result = await chatCompletion(config, messages);
    expect(result).toBe('Hello!');

    const fetchCalls = vi.mocked(fetch).mock.calls;
    expect(fetchCalls.length).toBe(1);
    const url = fetchCalls[0][0] as string;
    expect(url).toContain('chat/completions');
    const init = fetchCalls[0][1] as RequestInit;
    expect(init.headers).toHaveProperty('Authorization', 'Bearer test-key');
  });

  it('should call DeepSeek endpoint for deepseek provider', async () => {
    const responseBody = {
      choices: [{ message: { content: 'DeepSeek reply' } }],
    };
    vi.stubGlobal('fetch', mockFetchResponse(responseBody));

    const config: AIConfig = {
      provider: 'deepseek',
      apiKey: 'ds-key',
      model: 'deepseek-chat',
    };
    const result = await chatCompletion(config, messages);
    expect(result).toBe('DeepSeek reply');

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('deepseek.com');
  });

  it('should call Claude endpoint with correct headers', async () => {
    const responseBody = {
      content: [{ type: 'text', text: 'Claude says hi' }],
    };
    vi.stubGlobal('fetch', mockFetchResponse(responseBody));

    const config: AIConfig = {
      provider: 'claude',
      apiKey: 'claude-key',
      model: 'claude-sonnet-4-20250514',
    };
    const result = await chatCompletion(config, messages);
    expect(result).toBe('Claude says hi');

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('claude-key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });

  it('should split system messages for Claude provider', async () => {
    const responseBody = {
      content: [{ type: 'text', text: 'OK' }],
    };
    vi.stubGlobal('fetch', mockFetchResponse(responseBody));

    const config: AIConfig = {
      provider: 'claude',
      apiKey: 'key',
      model: 'claude-sonnet-4-20250514',
    };
    await chatCompletion(config, messages);

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.system).toBeDefined();
    expect(body.messages.every((m: { role: string }) => m.role !== 'system')).toBe(true);
  });

  it('should call Ollama endpoint without API key', async () => {
    const responseBody = {
      message: { content: 'Ollama response' },
    };
    vi.stubGlobal('fetch', mockFetchResponse(responseBody));

    const config: AIConfig = {
      provider: 'ollama',
      model: 'qwen2.5:7b',
    };
    const result = await chatCompletion(config, messages);
    expect(result).toBe('Ollama response');

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('api/chat');
  });

  it('should throw on API error', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({ error: 'bad request' }, false, 400));

    const config: AIConfig = {
      provider: 'openai',
      apiKey: 'key',
      model: 'gpt-4o',
    };
    await expect(chatCompletion(config, messages)).rejects.toThrow(/API error/);
  });

  it('should throw if API key is missing for openai', async () => {
    const config: AIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
    };
    await expect(chatCompletion(config, messages)).rejects.toThrow(/API key/);
  });

  it('should include temperature when specified', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({
      choices: [{ message: { content: 'ok' } }],
    }));

    const config: AIConfig = {
      provider: 'openai',
      apiKey: 'key',
      model: 'gpt-4o',
      temperature: 0.3,
    };
    await chatCompletion(config, messages);

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.temperature).toBe(0.3);
  });

  it('should handle empty response content gracefully', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({
      choices: [{ message: { content: '' } }],
    }));

    const config: AIConfig = {
      provider: 'openai',
      apiKey: 'key',
      model: 'gpt-4o',
    };
    const result = await chatCompletion(config, messages);
    expect(result).toBe('');
  });
});
