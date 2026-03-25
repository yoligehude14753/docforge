import { describe, it, expect } from 'vitest';
import { buildChapterTree } from '@/lib/knowledge/parser/structure';
import type { DocumentTree } from '@/lib/knowledge/parser/types';

describe('buildChapterTree', () => {
  it('should build chapter tree from flat nodes', () => {
    const doc: DocumentTree = {
      nodes: [
        { type: 'heading', level: 1, content: '第一章' },
        { type: 'paragraph', content: '第一章内容' },
        { type: 'heading', level: 2, content: '1.1 小节' },
        { type: 'paragraph', content: '小节内容' },
        { type: 'heading', level: 1, content: '第二章' },
        { type: 'paragraph', content: '第二章内容' },
      ],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };

    const tree = buildChapterTree(doc);
    expect(tree.length).toBe(2);
    expect(tree[0].title).toBe('第一章');
    expect(tree[0].children.length).toBe(1);
    expect(tree[0].children[0].title).toBe('1.1 小节');
    expect(tree[1].title).toBe('第二章');
  });

  it('should handle documents with content before first heading', () => {
    const doc: DocumentTree = {
      nodes: [
        { type: 'paragraph', content: '前言内容' },
        { type: 'heading', level: 1, content: '正文' },
        { type: 'paragraph', content: '正文内容' },
      ],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };

    const tree = buildChapterTree(doc);
    expect(tree.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty documents', () => {
    const doc: DocumentTree = {
      nodes: [],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };

    const tree = buildChapterTree(doc);
    expect(tree.length).toBe(0);
  });

  it('should assign correct paths', () => {
    const doc: DocumentTree = {
      nodes: [
        { type: 'heading', level: 1, content: 'Chapter 1' },
        { type: 'heading', level: 2, content: 'Section 1.1' },
        { type: 'heading', level: 2, content: 'Section 1.2' },
        { type: 'heading', level: 1, content: 'Chapter 2' },
        { type: 'heading', level: 2, content: 'Section 2.1' },
      ],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };

    const tree = buildChapterTree(doc);
    expect(tree[0].path).toBe('1');
    expect(tree[0].children[0].path).toBe('1.1');
    expect(tree[0].children[1].path).toBe('1.2');
    expect(tree[1].path).toBe('2');
    expect(tree[1].children[0].path).toBe('2.1');
  });

  it('should nest content under correct headings', () => {
    const doc: DocumentTree = {
      nodes: [
        { type: 'heading', level: 1, content: 'H1' },
        { type: 'paragraph', content: 'P1 under H1' },
        { type: 'heading', level: 2, content: 'H2' },
        { type: 'paragraph', content: 'P2 under H2' },
        { type: 'list-item', level: 1, content: 'List item' },
      ],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };

    const tree = buildChapterTree(doc);
    expect(tree[0].content.length).toBeGreaterThan(0);
    expect(tree[0].children[0].content.length).toBeGreaterThan(0);
  });
});
