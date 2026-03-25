import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractTemplateFromDocument } from '@/lib/template/extractor';
import type { DocumentTree } from '@/lib/knowledge/parser/types';
import type { AIConfig } from '@/lib/ai/provider';

const mockAiConfig: AIConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4o',
};

function makeTree(headings: { level: number; title: string }[]): DocumentTree {
  const nodes = headings.flatMap((h) => [
    { type: 'heading' as const, level: h.level, content: h.title },
    { type: 'paragraph' as const, content: `Content for ${h.title}.` },
  ]);
  return { nodes, metadata: { title: 'Source Doc' }, styles: new Map(), images: new Map() };
}

function mockOpenAiResponse(content: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      choices: [{ message: { content } }],
    }),
  } as unknown as Response));
}

describe('extractTemplateFromDocument', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should extract template using AI response', async () => {
    const aiResponse = JSON.stringify({
      name: 'AI Template',
      description: 'Extracted by AI',
      sections: [
        { title: 'Introduction', level: 1, description: 'Overview', children: [] },
        { title: 'Details', level: 1, description: 'Main body', children: [] },
      ],
    });
    mockOpenAiResponse(aiResponse);

    const tree = makeTree([
      { level: 1, title: 'Chapter 1' },
      { level: 1, title: 'Chapter 2' },
    ]);
    const template = await extractTemplateFromDocument(tree, mockAiConfig);
    expect(template.name).toBe('AI Template');
    expect(template.sections).toHaveLength(2);
    expect(template.isBuiltin).toBe(false);
    expect(template.id).toMatch(/^custom-/);
  });

  it('should use user-provided name over AI name', async () => {
    const aiResponse = JSON.stringify({
      name: 'AI Name',
      description: 'desc',
      sections: [{ title: 'Sec', level: 1, description: '', children: [] }],
    });
    mockOpenAiResponse(aiResponse);

    const tree = makeTree([{ level: 1, title: 'H1' }]);
    const template = await extractTemplateFromDocument(tree, mockAiConfig, 'User Name');
    expect(template.name).toBe('User Name');
  });

  it('should fall back to chapter tree when AI returns invalid JSON', async () => {
    mockOpenAiResponse('This is not JSON');

    const tree = makeTree([
      { level: 1, title: 'Overview' },
      { level: 2, title: 'Sub-section' },
    ]);
    const template = await extractTemplateFromDocument(tree, mockAiConfig);
    expect(template.sections.length).toBeGreaterThan(0);
    expect(template.isBuiltin).toBe(false);
  });

  it('should fall back when AI call fails entirely', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')));

    const tree = makeTree([{ level: 1, title: 'Fallback Chapter' }]);
    const template = await extractTemplateFromDocument(tree, mockAiConfig);
    expect(template.sections.length).toBeGreaterThan(0);
    const titles = template.sections.map((s) => s.title);
    expect(titles).toContain('Fallback Chapter');
  });

  it('should fall back when AI returns empty sections', async () => {
    mockOpenAiResponse(JSON.stringify({
      name: 'Empty',
      description: '',
      sections: [],
    }));

    const tree = makeTree([{ level: 1, title: 'Real Content' }]);
    const template = await extractTemplateFromDocument(tree, mockAiConfig);
    expect(template.sections.length).toBeGreaterThan(0);
  });

  it('should handle document with no headings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

    const tree: DocumentTree = {
      nodes: [{ type: 'paragraph', content: 'Just a paragraph' }],
      metadata: { title: 'Flat Doc' },
      styles: new Map(),
      images: new Map(),
    };
    const template = await extractTemplateFromDocument(tree, mockAiConfig);
    expect(template.sections.length).toBeGreaterThan(0);
    expect(template.sections[0].title).toBe('正文');
  });
});
