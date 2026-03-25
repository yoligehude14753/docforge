import { describe, it, expect } from 'vitest';
import { TextEmbedder } from '@/lib/knowledge/rag/embedder';

describe('TextEmbedder', () => {
  it('should create an instance', () => {
    const embedder = new TextEmbedder();
    expect(embedder).toBeDefined();
  });

  it('should add documents and compute IDF', () => {
    const embedder = new TextEmbedder();
    embedder.addDocuments([
      '数据标注平台支持多模态标注',
      '模型训练和评估系统',
      '数据管理和质量检查',
    ]);
    const vec = embedder.embed('数据标注');
    expect(vec.terms.size).toBeGreaterThan(0);
    expect(vec.norm).toBeGreaterThan(0);
  });

  it('should compute similarity between related texts', () => {
    const embedder = new TextEmbedder();
    embedder.addDocuments([
      '数据标注平台支持多模态标注功能',
      '模型训练和评估系统设计',
      '数据管理和质量检查工具',
    ]);
    const vecA = embedder.embed('数据标注平台');
    const vecB = embedder.embed('多模态标注功能');
    const vecC = embedder.embed('完全不相关的内容主题');
    
    const simAB = embedder.similarity(vecA, vecB);
    const simAC = embedder.similarity(vecA, vecC);
    
    expect(simAB).toBeGreaterThan(simAC);
  });

  it('should handle English text', () => {
    const embedder = new TextEmbedder();
    embedder.addDocuments([
      'machine learning model training',
      'data annotation and labeling tools',
    ]);
    const vec = embedder.embed('machine learning');
    expect(vec.terms.size).toBeGreaterThan(0);
  });

  it('should handle mixed Chinese and English text', () => {
    const embedder = new TextEmbedder();
    embedder.addDocuments([
      'AI智能标注 deep learning model',
      '数据处理 data pipeline',
    ]);
    const vec = embedder.embed('AI标注');
    expect(vec.terms.size).toBeGreaterThan(0);
  });

  it('should serialize and deserialize', () => {
    const embedder = new TextEmbedder();
    embedder.addDocuments(['测试文本一', '测试文本二']);
    const json = embedder.serialize();
    const restored = TextEmbedder.deserialize(json);
    
    const vecOriginal = embedder.embed('测试');
    const vecRestored = restored.embed('测试');
    
    expect(vecRestored.terms.size).toBe(vecOriginal.terms.size);
  });

  it('should return 0 similarity for empty vectors', () => {
    const embedder = new TextEmbedder();
    const vecA = embedder.embed('');
    const vecB = embedder.embed('test');
    expect(embedder.similarity(vecA, vecB)).toBe(0);
  });

  it('should return 1.0 similarity for identical texts', () => {
    const embedder = new TextEmbedder();
    embedder.addDocuments(['hello world']);
    const vecA = embedder.embed('hello world');
    const vecB = embedder.embed('hello world');
    const sim = embedder.similarity(vecA, vecB);
    expect(sim).toBeCloseTo(1.0, 5);
  });
});
