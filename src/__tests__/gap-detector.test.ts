import { describe, it, expect } from 'vitest';
import { detectGaps } from '@/lib/pipeline/gap-detector';
import type { MatchMatrix } from '@/lib/knowledge/matcher';

describe('detectGaps', () => {
  it('should detect missing material gaps', () => {
    const matrix: MatchMatrix = {
      results: [
        {
          requirement: { id: 'r1', text: '支持区块链功能' },
          matches: [],
          coverage: 'none',
          gapDescription: 'No matching materials found',
        },
      ],
      overallCoverage: 0,
      gaps: [{ id: 'r1', text: '支持区块链功能' }],
    };
    const gaps = detectGaps(matrix);
    expect(gaps.length).toBe(1);
    expect(gaps[0].type).toBe('missing-material');
  });

  it('should detect insufficient detail gaps', () => {
    const matrix: MatchMatrix = {
      results: [
        {
          requirement: { id: 'r1', text: '详细的安全方案' },
          matches: [{
            score: 0.2,
            entry: {
              id: 'e1',
              text: '安全相关',
              vector: { terms: new Map(), norm: 0 },
              metadata: { sourceFile: 'ref.docx', chapterPath: '1', nodeType: 'paragraph' },
            },
          }],
          coverage: 'partial',
        },
      ],
      overallCoverage: 0.5,
      gaps: [],
    };
    const gaps = detectGaps(matrix);
    expect(gaps.length).toBe(1);
    expect(gaps[0].type).toBe('insufficient-detail');
  });

  it('should return empty gaps for full coverage', () => {
    const matrix: MatchMatrix = {
      results: [
        {
          requirement: { id: 'r1', text: '数据标注功能' },
          matches: [{
            score: 0.8,
            entry: {
              id: 'e1',
              text: '数据标注平台',
              vector: { terms: new Map(), norm: 0 },
              metadata: { sourceFile: 'ref.docx', chapterPath: '1', nodeType: 'paragraph' },
            },
          }],
          coverage: 'full',
        },
      ],
      overallCoverage: 1,
      gaps: [],
    };
    const gaps = detectGaps(matrix);
    const realGaps = gaps.filter(g => g.type !== 'needs-verification');
    expect(realGaps.length).toBe(0);
  });
});
