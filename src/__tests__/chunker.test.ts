import { describe, it, expect } from 'vitest';
import { chunkDocument } from '@/lib/knowledge/rag/chunker';
import type { DocumentTree } from '@/lib/knowledge/parser/types';

describe('chunkDocument', () => {
  function makeDoc(): DocumentTree {
    return {
      nodes: [
        { type: 'heading', level: 1, content: '第一章 概述' },
        { type: 'paragraph', content: '本文介绍了数据标注平台的整体架构和功能设计。' },
        { type: 'paragraph', content: '平台支持多种数据类型的标注工作。' },
        { type: 'heading', level: 2, content: '1.1 系统架构' },
        { type: 'paragraph', content: '系统采用微服务架构，基于Kubernetes容器化部署。' },
        { type: 'heading', level: 2, content: '1.2 功能模块' },
        { type: 'paragraph', content: '包含数据管理、标注工具、质量检查、模型训练四大模块。' },
        { type: 'heading', level: 1, content: '第二章 技术方案' },
        { type: 'paragraph', content: '技术方案基于深度学习和自然语言处理技术。' },
      ],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };
  }

  it('should create chunks from document', () => {
    const doc = makeDoc();
    const chunks = chunkDocument(doc, 'test.docx');
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should preserve source file metadata', () => {
    const doc = makeDoc();
    const chunks = chunkDocument(doc, 'test.docx');
    for (const chunk of chunks) {
      expect(chunk.metadata.sourceFile).toBe('test.docx');
    }
  });

  it('should include heading context', () => {
    const doc = makeDoc();
    const chunks = chunkDocument(doc, 'test.docx');
    const hasContext = chunks.some(c => c.metadata.headingContext.length > 0);
    expect(hasContext).toBe(true);
  });

  it('should handle documents with no headings', () => {
    const doc: DocumentTree = {
      nodes: [
        { type: 'paragraph', content: '一段没有标题的文本。' },
        { type: 'paragraph', content: '另一段文本。' },
      ],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };
    const chunks = chunkDocument(doc, 'test.docx');
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should handle empty documents', () => {
    const doc: DocumentTree = {
      nodes: [],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };
    const chunks = chunkDocument(doc, 'test.docx');
    expect(chunks.length).toBe(0);
  });

  it('should respect maxChunkSize', () => {
    const longParagraph = '这是一段很长的文本。'.repeat(100);
    const doc: DocumentTree = {
      nodes: [
        { type: 'heading', level: 1, content: '长文档' },
        { type: 'paragraph', content: longParagraph },
      ],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };
    const chunks = chunkDocument(doc, 'test.docx', { maxChunkSize: 200 });
    expect(chunks.length).toBeGreaterThan(1);
  });
});
