import { describe, it, expect } from 'vitest';
import { VectorStore } from '@/lib/knowledge/rag/vector-store';
import { TextEmbedder } from '@/lib/knowledge/rag/embedder';

describe('VectorStore', () => {
  function createStoreWithDocs() {
    const embedder = new TextEmbedder();
    embedder.addDocuments([
      '数据标注平台支持多模态标注',
      '模型训练和评估系统',
      '数据管理和质量检查',
      '项目管理和工作流编排',
      '用户权限和角色管理',
    ]);
    const store = new VectorStore(embedder);
    store.add('doc1', '数据标注平台支持多模态标注', {
      sourceFile: 'ref1.docx',
      chapterPath: '1.1',
      nodeType: 'paragraph',
    });
    store.add('doc2', '模型训练和评估系统', {
      sourceFile: 'ref1.docx',
      chapterPath: '2.1',
      nodeType: 'paragraph',
    });
    store.add('doc3', '数据管理和质量检查', {
      sourceFile: 'ref2.docx',
      chapterPath: '1.1',
      nodeType: 'paragraph',
    });
    store.add('doc4', '项目管理和工作流编排', {
      sourceFile: 'ref2.docx',
      chapterPath: '1.2',
      nodeType: 'paragraph',
    });
    store.add('doc5', '用户权限和角色管理', {
      sourceFile: 'ref2.docx',
      chapterPath: '1.3',
      nodeType: 'paragraph',
    });
    return store;
  }

  it('should add and retrieve entries', () => {
    const store = createStoreWithDocs();
    expect(store.size()).toBe(5);
  });

  it('should search and return relevant results', () => {
    const store = createStoreWithDocs();
    const results = store.search('数据标注');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('should return results sorted by score descending', () => {
    const store = createStoreWithDocs();
    const results = store.search('模型训练评估', 5, 0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('should respect topK parameter', () => {
    const store = createStoreWithDocs();
    const results = store.search('数据', 2, 0);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('should remove entries by source file', () => {
    const store = createStoreWithDocs();
    store.removeBySource('ref2.docx');
    expect(store.size()).toBe(2);
  });

  it('should serialize and deserialize', () => {
    const store = createStoreWithDocs();
    const json = store.serialize();
    expect(json).toBeTruthy();
    const restored = VectorStore.deserialize(json);
    expect(restored.size()).toBe(5);
    
    const results = restored.search('数据标注');
    expect(results.length).toBeGreaterThan(0);
  });
});
