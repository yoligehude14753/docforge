import { describe, it, expect } from 'vitest';
import { RequirementMatcher } from '@/lib/knowledge/matcher';
import { KnowledgeRetriever } from '@/lib/knowledge/rag/retriever';
import type { DocumentTree } from '@/lib/knowledge/parser/types';

describe('RequirementMatcher', () => {
  function makeRetrieverWithDocs(): KnowledgeRetriever {
    const retriever = new KnowledgeRetriever();
    const doc: DocumentTree = {
      nodes: [
        { type: 'heading', level: 1, content: '数据标注平台' },
        { type: 'paragraph', content: '平台支持2D图像标注、语义分割、目标检测等多种计算机视觉标注任务。' },
        { type: 'paragraph', content: '提供DAG工作流编排引擎，可视化拖拽式任务编排。' },
        { type: 'heading', level: 1, content: '模型训练' },
        { type: 'paragraph', content: '支持一键模型训练，预置YOLO等基础模型，支持大模型微调。' },
        { type: 'paragraph', content: '动态训练指标监控，GPU资源调度和监控。' },
      ],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };
    retriever.indexDocument(doc, 'ref.docx');
    return retriever;
  }

  describe('parseRequirements', () => {
    it('should parse numbered requirements', () => {
      const retriever = new KnowledgeRetriever();
      const matcher = new RequirementMatcher(retriever);
      const reqs = matcher.parseRequirements(
        '1. 支持图像标注功能\n2. 支持模型训练功能\n3. 提供数据管理工具'
      );
      expect(reqs.length).toBe(3);
      expect(reqs[0].text).toContain('图像标注');
    });

    it('should parse Chinese numbered requirements', () => {
      const retriever = new KnowledgeRetriever();
      const matcher = new RequirementMatcher(retriever);
      const reqs = matcher.parseRequirements(
        '一、支持图像标注\n二、支持模型训练\n三、数据管理'
      );
      expect(reqs.length).toBe(3);
    });

    it('should parse parenthetical numbered requirements', () => {
      const retriever = new KnowledgeRetriever();
      const matcher = new RequirementMatcher(retriever);
      const reqs = matcher.parseRequirements(
        '(1) 支持图像标注\n(2) 支持模型训练'
      );
      expect(reqs.length).toBe(2);
    });

    it('should fall back to line splitting', () => {
      const retriever = new KnowledgeRetriever();
      const matcher = new RequirementMatcher(retriever);
      const reqs = matcher.parseRequirements(
        '支持图像标注\n支持模型训练'
      );
      expect(reqs.length).toBe(2);
    });
  });

  describe('matchAll', () => {
    it('should match requirements against indexed documents', async () => {
      const retriever = makeRetrieverWithDocs();
      const matcher = new RequirementMatcher(retriever);
      const reqs = matcher.parseRequirements(
        '1. 支持图像标注功能\n2. 支持模型训练功能\n3. 支持区块链功能'
      );
      const matrix = await matcher.matchAll(reqs);
      expect(matrix.results.length).toBe(3);
      expect(matrix.overallCoverage).toBeGreaterThanOrEqual(0);
      expect(matrix.overallCoverage).toBeLessThanOrEqual(1);
    });

    it('should identify gaps', async () => {
      const retriever = makeRetrieverWithDocs();
      const matcher = new RequirementMatcher(retriever);
      const reqs = matcher.parseRequirements(
        '1. 完全不相关的区块链需求\n2. 量子计算支持'
      );
      const matrix = await matcher.matchAll(reqs);
      expect(matrix.gaps.length).toBeGreaterThan(0);
    });
  });
});
