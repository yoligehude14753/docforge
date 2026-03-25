import { describe, it, expect } from 'vitest';
import { buildDocument } from '@/lib/document/builder';
import type { DocConfig } from '@/lib/document/builder';

describe('Document Builder', () => {
  const basicConfig: DocConfig = {
    title: '测试文档',
    sections: [
      {
        title: '第一章 概述',
        level: 1,
        content: '这是一个测试文档的概述部分。\n\n本文档用于测试Word生成功能。',
      },
      {
        title: '第二章 详细方案',
        level: 1,
        content: '详细方案包含以下内容：\n\n- 功能设计\n- 技术架构\n- 实施计划',
        children: [
          {
            title: '2.1 功能设计',
            level: 2,
            content: '功能设计遵循以下原则：\n\n1. 用户友好\n2. 可扩展性\n3. 高性能',
          },
        ],
      },
    ],
  };

  it('should generate a document blob', async () => {
    const blob = await buildDocument(basicConfig);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should generate document with cover page', async () => {
    const config: DocConfig = {
      ...basicConfig,
      includeCover: true,
      company: '测试公司',
      author: '测试作者',
      date: '2026-03-25',
    };
    const blob = await buildDocument(config);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should generate document with TOC', async () => {
    const config: DocConfig = {
      ...basicConfig,
      includeToc: true,
    };
    const blob = await buildDocument(config);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('should generate document with header and footer', async () => {
    const config: DocConfig = {
      ...basicConfig,
      headerText: '测试文档标题',
      footerText: '机密文件',
    };
    const blob = await buildDocument(config);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('should handle empty sections', async () => {
    const config: DocConfig = {
      title: '空文档',
      sections: [],
    };
    const blob = await buildDocument(config);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('should handle content with bullet points', async () => {
    const config: DocConfig = {
      title: '列表文档',
      sections: [
        {
          title: '列表测试',
          level: 1,
          content: '功能列表：\n\n- 数据管理\n- 标注工具\n- 质量检查\n\n以上是主要功能。',
        },
      ],
    };
    const blob = await buildDocument(config);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should handle content with numbered lists', async () => {
    const config: DocConfig = {
      title: '编号列表',
      sections: [
        {
          title: '步骤',
          level: 1,
          content: '实施步骤：\n\n1. 需求分析\n2. 方案设计\n3. 开发实施\n4. 测试验收',
        },
      ],
    };
    const blob = await buildDocument(config);
    expect(blob).toBeInstanceOf(Blob);
  });
});
