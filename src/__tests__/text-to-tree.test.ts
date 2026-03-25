import { describe, it, expect } from 'vitest';
import { textToDocumentTree } from '@/lib/knowledge/parser/text-to-tree';

describe('textToDocumentTree', () => {
  it('should convert plain text into paragraph nodes', () => {
    const tree = textToDocumentTree('Line one\nLine two\nLine three');
    expect(tree.nodes).toHaveLength(3);
    expect(tree.nodes.every((n) => n.type === 'paragraph')).toBe(true);
    expect(tree.nodes[0].content).toBe('Line one');
  });

  it('should detect markdown headings', () => {
    const tree = textToDocumentTree('# Title\nSome content\n## Section');
    const headings = tree.nodes.filter((n) => n.type === 'heading');
    expect(headings).toHaveLength(2);
    expect(headings[0].level).toBe(1);
    expect(headings[0].content).toBe('Title');
    expect(headings[1].level).toBe(2);
    expect(headings[1].content).toBe('Section');
  });

  it('should skip empty lines', () => {
    const tree = textToDocumentTree('First\n\n\nSecond');
    expect(tree.nodes).toHaveLength(2);
  });

  it('should set title in metadata', () => {
    const tree = textToDocumentTree('content', 'My Title');
    expect(tree.metadata.title).toBe('My Title');
  });

  it('should return empty nodes for empty input', () => {
    const tree = textToDocumentTree('');
    expect(tree.nodes).toHaveLength(0);
  });

  it('should initialize styles and images as empty maps', () => {
    const tree = textToDocumentTree('test');
    expect(tree.styles.size).toBe(0);
    expect(tree.images.size).toBe(0);
  });
});
