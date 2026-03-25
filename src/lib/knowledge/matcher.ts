import type { SearchResult } from './rag/vector-store';
import { KnowledgeRetriever } from './rag/retriever';

export interface Requirement {
  id: string;
  text: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface MatchResult {
  requirement: Requirement;
  matches: SearchResult[];
  coverage: 'full' | 'partial' | 'none';
  gapDescription?: string;
}

export interface MatchMatrix {
  results: MatchResult[];
  overallCoverage: number;
  gaps: Requirement[];
}

const NUMBERED_LINE =
  /^\s*(?:\(?(\d+)\)|(\d+)[.、．]|[一二三四五六七八九十百千]+[、.．]|\((\d+)\))\s*(.*)$/;

function splitByNumberedItems(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  let sawNumbered = false;

  const flushBlock = () => {
    const s = current.join('\n').trim();
    if (s) {
      blocks.push(s);
    }
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (NUMBERED_LINE.test(trimmed) && current.length > 0) {
      sawNumbered = true;
      flushBlock();
    }
    current.push(line);
  }
  flushBlock();

  if (sawNumbered || blocks.length > 1) {
    return blocks;
  }

  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export class RequirementMatcher {
  private retriever: KnowledgeRetriever;

  constructor(retriever: KnowledgeRetriever) {
    this.retriever = retriever;
  }

  parseRequirements(text: string): Requirement[] {
    const items = splitByNumberedItems(text);
    return items.map((t, i) => ({
      id: `req-${i + 1}`,
      text: t.trim(),
    }));
  }

  async matchOne(requirement: Requirement): Promise<MatchResult> {
    const matches = await this.retriever.search(requirement.text, 5, 0);
    const top = matches[0]?.score ?? 0;
    let coverage: MatchResult['coverage'];
    let gapDescription: string | undefined;
    if (top > 0.3) {
      coverage = 'full';
    } else if (top > 0.15) {
      coverage = 'partial';
    } else {
      coverage = 'none';
      gapDescription = 'No matching materials found';
    }
    return {
      requirement,
      matches,
      coverage,
      gapDescription,
    };
  }

  async matchAll(requirements: Requirement[]): Promise<MatchMatrix> {
    const results: MatchResult[] = [];
    for (const r of requirements) {
      results.push(await this.matchOne(r));
    }
    const scores: number[] = results.map((m) => {
      if (m.coverage === 'full') {
        return 1;
      }
      if (m.coverage === 'partial') {
        return 0.5;
      }
      return 0;
    });
    const overallCoverage =
      scores.length === 0 ? 0 : scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    const gaps = results.filter((m) => m.coverage === 'none').map((m) => m.requirement);
    return { results, overallCoverage, gaps };
  }
}
