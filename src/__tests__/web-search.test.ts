import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webSearch } from '@/lib/knowledge/research/web-search';
import type { SearchConfig } from '@/lib/knowledge/research/web-search';

function mockFetchResponse(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

describe('webSearch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty array when API key is missing', async () => {
    const config: SearchConfig = { provider: 'tavily', apiKey: '' };
    const results = await webSearch('test query', config);
    expect(results).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should search Tavily and parse results', async () => {
    const tavilyResponse = {
      results: [
        { title: 'Result 1', url: 'https://example.com/1', content: 'Content 1' },
        { title: 'Result 2', url: 'https://example.com/2', content: 'Content 2' },
      ],
    };
    vi.stubGlobal('fetch', mockFetchResponse(tavilyResponse));

    const config: SearchConfig = { provider: 'tavily', apiKey: 'tavily-key' };
    const results = await webSearch('test query', config, 5);
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Result 1');
    expect(results[0].url).toBe('https://example.com/1');
    expect(results[0].snippet).toBe('Content 1');

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('tavily.com');
  });

  it('should search Bing and parse results', async () => {
    const bingResponse = {
      webPages: {
        value: [
          { name: 'Bing Result', url: 'https://bing.com/1', snippet: 'Bing snippet' },
        ],
      },
    };
    vi.stubGlobal('fetch', mockFetchResponse(bingResponse));

    const config: SearchConfig = { provider: 'bing', apiKey: 'bing-key' };
    const results = await webSearch('test', config);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Bing Result');
    expect(results[0].snippet).toBe('Bing snippet');

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Ocp-Apim-Subscription-Key']).toBe('bing-key');
  });

  it('should return empty array on Tavily API error', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({}, false));

    const config: SearchConfig = { provider: 'tavily', apiKey: 'key' };
    const results = await webSearch('query', config);
    expect(results).toEqual([]);
  });

  it('should return empty array on Bing API error', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({}, false));

    const config: SearchConfig = { provider: 'bing', apiKey: 'key' };
    const results = await webSearch('query', config);
    expect(results).toEqual([]);
  });

  it('should return empty array on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const config: SearchConfig = { provider: 'tavily', apiKey: 'key' };
    const results = await webSearch('query', config);
    expect(results).toEqual([]);
  });

  it('should handle malformed Tavily response', async () => {
    vi.stubGlobal('fetch', mockFetchResponse({ results: 'not an array' }));

    const config: SearchConfig = { provider: 'tavily', apiKey: 'key' };
    const results = await webSearch('query', config);
    expect(results).toEqual([]);
  });

  it('should truncate long content to snippet', async () => {
    const longContent = 'x'.repeat(1000);
    const tavilyResponse = {
      results: [{ title: 'Long', url: 'https://example.com', content: longContent }],
    };
    vi.stubGlobal('fetch', mockFetchResponse(tavilyResponse));

    const config: SearchConfig = { provider: 'tavily', apiKey: 'key' };
    const results = await webSearch('query', config);
    expect(results[0].snippet.length).toBeLessThanOrEqual(500);
  });
});
