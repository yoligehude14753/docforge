import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deepResearch } from '@/lib/knowledge/research/deep-research';
import type { ResearchConfig, ResearchCallbacks } from '@/lib/knowledge/research/deep-research';
import type { AIConfig } from '@/lib/ai/provider';

const mockAiConfig: AIConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4o',
};

function mockChatCompletion(responses: string[]) {
  let callIndex = 0;
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
    const content = responses[callIndex] ?? '';
    callIndex++;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content } }],
      }),
    } as unknown as Response);
  }));
}

describe('deepResearch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a result with topic and summary', async () => {
    mockChatCompletion([
      '{"subQueries":["query 1","query 2"]}',
      'Research summary content here.',
    ]);

    const config: ResearchConfig = { aiConfig: mockAiConfig };
    const result = await deepResearch('AI in healthcare', config);
    expect(result.topic).toBe('AI in healthcare');
    expect(result.subQueries.length).toBeGreaterThan(0);
    expect(typeof result.summary).toBe('string');
  });

  it('should use topic as fallback when sub-query parsing fails', async () => {
    mockChatCompletion([
      'not valid JSON',
      'Fallback summary.',
    ]);

    const config: ResearchConfig = { aiConfig: mockAiConfig };
    const result = await deepResearch('quantum computing', config);
    expect(result.subQueries).toHaveLength(1);
    expect(result.subQueries[0]).toContain('quantum computing');
  });

  it('should invoke callbacks during execution', async () => {
    mockChatCompletion([
      '{"subQueries":["sub1"]}',
      'Summary text.',
    ]);

    const callbacks: ResearchCallbacks = {
      onStatus: vi.fn(),
      onSubQuery: vi.fn(),
      onSourceFound: vi.fn(),
      onComplete: vi.fn(),
    };

    const config: ResearchConfig = { aiConfig: mockAiConfig };
    await deepResearch('test topic', config, callbacks);

    expect(callbacks.onStatus).toHaveBeenCalled();
    expect(callbacks.onComplete).toHaveBeenCalled();
  });

  it('should skip web search when searchConfig is not provided', async () => {
    mockChatCompletion([
      '{"subQueries":["q1"]}',
      'No web sources summary.',
    ]);

    const config: ResearchConfig = { aiConfig: mockAiConfig };
    const result = await deepResearch('test', config);
    expect(result.sources).toHaveLength(0);
  });

  it('should respect maxIterations', async () => {
    mockChatCompletion([
      '{"subQueries":["a","b","c","d","e"]}',
      'Limited summary.',
    ]);

    const config: ResearchConfig = { aiConfig: mockAiConfig, maxIterations: 2 };
    const result = await deepResearch('test', config);
    expect(result.subQueries.length).toBeLessThanOrEqual(2);
  });

  it('should handle AI failure gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('AI down')));

    const config: ResearchConfig = { aiConfig: mockAiConfig };
    const result = await deepResearch('fail topic', config);
    expect(result.topic).toBe('fail topic');
    expect(result.subQueries.length).toBeGreaterThan(0);
  });
});
