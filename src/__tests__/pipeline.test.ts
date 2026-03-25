import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeRequirements } from '@/lib/pipeline/analyzer';
import { generateSection, regenerateSection } from '@/lib/pipeline/generator';
import { refineSection } from '@/lib/pipeline/refiner';
import type { AIConfig } from '@/lib/ai/provider';
import type { GenerationContext } from '@/lib/pipeline/generator';

const mockAiConfig: AIConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4o',
};

function mockOpenAiResponse(content: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      choices: [{ message: { content } }],
    }),
  } as unknown as Response));
}

describe('analyzeRequirements', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should parse valid AI JSON response', async () => {
    const aiJson = JSON.stringify({
      requirements: [
        { id: 'r1', text: 'Build data pipeline', category: 'technical', priority: 'high' },
      ],
      outline: [
        { title: 'Overview', level: 1, description: 'Intro', children: [] },
        { title: 'Technical Design', level: 1, description: 'Details', children: [] },
      ],
      documentType: '解决方案',
      suggestedTitle: '数据管线方案',
    });
    mockOpenAiResponse(aiJson);

    const result = await analyzeRequirements('Build a data pipeline', '解决方案', mockAiConfig);
    expect(result.requirements).toHaveLength(1);
    expect(result.requirements[0].text).toBe('Build data pipeline');
    expect(result.outline.length).toBeGreaterThanOrEqual(2);
    expect(result.documentType).toBe('解决方案');
    expect(result.suggestedTitle).toBe('数据管线方案');
  });

  it('should handle AI JSON wrapped in fences', async () => {
    const fenced = '```json\n' + JSON.stringify({
      requirements: [{ id: 'r1', text: 'Test req', category: 'gen', priority: 'low' }],
      outline: [{ title: 'Intro', level: 1, description: '', children: [] }],
      documentType: '标书',
      suggestedTitle: 'Title',
    }) + '\n```';
    mockOpenAiResponse(fenced);

    const result = await analyzeRequirements('Test', '标书', mockAiConfig);
    expect(result.requirements[0].text).toBe('Test req');
  });

  it('should return fallback on invalid AI response', async () => {
    mockOpenAiResponse('This is not JSON at all.');

    const result = await analyzeRequirements('Some requirement text', '标书响应文件', mockAiConfig);
    expect(result.requirements).toHaveLength(1);
    expect(result.outline).toHaveLength(1);
    expect(result.outline[0].title).toContain('Overview');
  });

  it('should return fallback when AI call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await analyzeRequirements('test', '标书', mockAiConfig);
    expect(result.requirements).toHaveLength(1);
  });

  it('should invoke onStatus callback', async () => {
    mockOpenAiResponse('invalid');
    const statuses: string[] = [];
    await analyzeRequirements('test', '标书', mockAiConfig, (s) => statuses.push(s));
    expect(statuses.length).toBeGreaterThan(0);
  });
});

describe('generateSection', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should generate section content using AI', async () => {
    mockOpenAiResponse('Generated section content here.');

    const context: GenerationContext = {
      section: { title: 'Overview', level: 1, description: 'Intro section', children: [] },
      ragResults: [],
      previousSections: [],
      documentType: '解决方案',
    };
    const result = await generateSection(context, mockAiConfig);
    expect(result).toBe('Generated section content here.');
  });

  it('should include RAG results in the prompt', async () => {
    mockOpenAiResponse('With RAG context.');

    const context: GenerationContext = {
      section: { title: 'Design', level: 1, description: 'Architecture', children: [] },
      ragResults: [
        {
          score: 0.9,
          entry: {
            id: 'e1',
            text: 'Reference material about architecture.',
            vector: { terms: new Map(), norm: 0 },
            metadata: { sourceFile: 'ref.docx', chapterPath: 'Chapter 1', nodeType: 'paragraph' },
          },
        },
      ],
      previousSections: ['Previous section content.'],
      documentType: '标书',
    };
    const result = await generateSection(context, mockAiConfig);
    expect(result).toBe('With RAG context.');

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMsg.content).toContain('Reference material');
    expect(userMsg.content).toContain('ref.docx');
  });
});

describe('regenerateSection', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should include feedback in regeneration', async () => {
    mockOpenAiResponse('Revised content.');

    const context: GenerationContext = {
      section: { title: 'Methods', level: 2, description: 'Methodology', children: [] },
      ragResults: [],
      previousSections: [],
      documentType: '方案',
    };
    const result = await regenerateSection(context, 'Make it more concise', mockAiConfig);
    expect(result).toBe('Revised content.');

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMsg.content).toContain('Make it more concise');
  });
});

describe('refineSection', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should refine existing content based on feedback', async () => {
    mockOpenAiResponse('Refined and improved content.');

    const result = await refineSection(
      'Original section content.',
      'Add more technical details',
      mockAiConfig,
    );
    expect(result).toBe('Refined and improved content.');

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMsg.content).toContain('Original section content.');
    expect(userMsg.content).toContain('Add more technical details');
  });

  it('should handle AI failure gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('AI error')));

    await expect(
      refineSection('content', 'feedback', mockAiConfig),
    ).rejects.toThrow();
  });
});
