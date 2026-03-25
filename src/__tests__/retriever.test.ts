import { describe, it, expect } from 'vitest';
import { KnowledgeRetriever } from '@/lib/knowledge/rag/retriever';
import type { DocumentTree } from '@/lib/knowledge/parser/types';

function makeTree(paragraphs: string[], title?: string): DocumentTree {
  return {
    nodes: paragraphs.map((text) => ({
      type: 'paragraph' as const,
      content: text,
    })),
    metadata: { title },
    styles: new Map(),
    images: new Map(),
  };
}

function makeTreeWithHeadings(sections: { heading: string; content: string }[]): DocumentTree {
  const nodes = sections.flatMap((s) => [
    { type: 'heading' as const, level: 1, content: s.heading },
    { type: 'paragraph' as const, content: s.content },
  ]);
  return { nodes, metadata: {}, styles: new Map(), images: new Map() };
}

describe('KnowledgeRetriever', () => {
  it('should create an instance', () => {
    const retriever = new KnowledgeRetriever();
    expect(retriever).toBeDefined();
  });

  it('should index a document and return chunk count', async () => {
    const retriever = new KnowledgeRetriever();
    const tree = makeTree(['数据标注平台支持多种标注类型，包括文本标注、图像标注和语音标注。']);
    const count = await retriever.indexDocument(tree, 'test.docx');
    expect(count).toBeGreaterThan(0);
  });

  it('should search indexed content', async () => {
    const retriever = new KnowledgeRetriever();
    const tree = makeTree([
      '数据标注平台支持多种标注类型，包括文本标注、图像标注和语音标注。',
      '模型训练系统可以进行分布式训练，支持多种深度学习框架。',
      '数据管理模块提供数据版本控制和质量检查功能。',
    ]);
    await retriever.indexDocument(tree, 'features.docx');
    const results = await retriever.search('数据标注', 5, 0);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should index multiple documents', async () => {
    const retriever = new KnowledgeRetriever();
    const tree1 = makeTree(['机器学习平台提供自动化特征工程能力。']);
    const tree2 = makeTree(['数据标注工具支持协同标注和质量审核。']);
    await retriever.indexDocument(tree1, 'ml.docx');
    await retriever.indexDocument(tree2, 'label.docx');
    const files = retriever.getIndexedFiles();
    expect(files).toContain('ml.docx');
    expect(files).toContain('label.docx');
  });

  it('should remove a document', async () => {
    const retriever = new KnowledgeRetriever();
    const tree = makeTree(['临时文档内容。']);
    await retriever.indexDocument(tree, 'temp.docx');
    expect(retriever.getIndexedFiles()).toContain('temp.docx');
    retriever.removeDocument('temp.docx');
    expect(retriever.getIndexedFiles()).not.toContain('temp.docx');
  });

  it('should re-index when same source uploaded again', async () => {
    const retriever = new KnowledgeRetriever();
    const tree1 = makeTree(['版本一的内容。']);
    await retriever.indexDocument(tree1, 'doc.docx');
    const tree2 = makeTree(['版本二的内容已经完全不同。']);
    const count = await retriever.indexDocument(tree2, 'doc.docx');
    expect(count).toBeGreaterThan(0);
    const files = retriever.getIndexedFiles();
    expect(files.filter((f) => f === 'doc.docx')).toHaveLength(1);
  });

  it('should serialize and deserialize', async () => {
    const retriever = new KnowledgeRetriever();
    const tree = makeTree(['序列化测试数据。']);
    await retriever.indexDocument(tree, 'ser.docx');
    const json = retriever.serialize();
    const restored = KnowledgeRetriever.deserialize(json);
    expect(restored.getIndexedFiles()).toContain('ser.docx');
    const results = await restored.search('序列化', 5, 0);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle structured documents with headings', async () => {
    const retriever = new KnowledgeRetriever();
    const tree = makeTreeWithHeadings([
      { heading: '数据采集', content: '支持多种数据源接入，包括API、数据库和文件系统。' },
      { heading: '数据清洗', content: '自动检测异常值、缺失值，提供多种清洗策略。' },
    ]);
    await retriever.indexDocument(tree, 'pipeline.docx');
    const results = await retriever.search('数据清洗异常值', 3, 0);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return empty results for unrelated queries', async () => {
    const retriever = new KnowledgeRetriever();
    const tree = makeTree(['人工智能与机器学习技术。']);
    await retriever.indexDocument(tree, 'ai.docx');
    const results = await retriever.search('完全无关的烹饪菜谱内容', 5, 0.5);
    expect(results).toHaveLength(0);
  });
});
