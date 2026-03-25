import { chatCompletion } from '@/lib/ai/provider';
import type { AIConfig, ChatMessage } from '@/lib/ai/provider';
import type { SearchConfig, WebSearchResult } from './web-search';
import { webSearch } from './web-search';

export interface ResearchConfig {
  aiConfig: AIConfig;
  searchConfig?: SearchConfig;
  maxIterations?: number;
}

export interface ResearchResult {
  topic: string;
  summary: string;
  sources: WebSearchResult[];
  subQueries: string[];
}

export interface ResearchCallbacks {
  onStatus: (status: string) => void;
  onSubQuery: (query: string) => void;
  onSourceFound: (source: WebSearchResult) => void;
  onComplete: (result: ResearchResult) => void;
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return fence ? fence[1].trim() : t;
}

function parseSubQueries(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(stripJsonFence(raw));
    if (!parsed || typeof parsed !== 'object') return [];
    const sq = (parsed as { subQueries?: unknown }).subQueries;
    if (!Array.isArray(sq)) return [];
    return sq
      .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
      .map((q) => q.trim())
      .slice(0, 8);
  } catch {
    return [];
  }
}

function dedupeSources(sources: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  const out: WebSearchResult[] = [];
  for (const s of sources) {
    const key = s.url || `${s.title}:${s.snippet}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function formatSourcesForPrompt(sources: WebSearchResult[]): string {
  if (sources.length === 0) return '(No web sources.)';
  return sources
    .map((s, i) => {
      const body = s.content ?? s.snippet;
      return `[${i + 1}] ${s.title}\nURL: ${s.url}\n${body}`;
    })
    .join('\n\n---\n\n');
}

export async function deepResearch(
  topic: string,
  config: ResearchConfig,
  callbacks?: ResearchCallbacks,
): Promise<ResearchResult> {
  const maxIterations = config.maxIterations ?? 3;
  const emit = (status: string) => {
    callbacks?.onStatus(status);
  };

  emit('Decomposing topic into sub-queries…');
  const decomposeMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You break research topics into focused web search queries. Reply with JSON only: {"subQueries":["..."]} with 3 to 5 distinct, concise queries.',
    },
    {
      role: 'user',
      content: `Topic:\n${topic}\n\nProduce 3-5 sub-queries as JSON.`,
    },
  ];

  let subQueries: string[] = [];
  try {
    const raw = await chatCompletion(config.aiConfig, decomposeMessages);
    subQueries = parseSubQueries(raw);
  } catch {
    subQueries = [];
  }

  if (subQueries.length === 0) {
    subQueries = [topic.slice(0, 200)];
  }
  subQueries = subQueries.slice(0, maxIterations);

  const allSources: WebSearchResult[] = [];

  if (config.searchConfig) {
    for (const q of subQueries) {
      emit(`Searching: ${q}`);
      callbacks?.onSubQuery(q);
      const batch = await webSearch(q, config.searchConfig, 5);
      for (const s of batch) {
        allSources.push(s);
        callbacks?.onSourceFound(s);
      }
    }
  } else {
    emit('No search configuration; skipping web search.');
  }

  const sources = dedupeSources(allSources);

  emit('Synthesizing summary…');
  const synthesisMessages: ChatMessage[] =
    sources.length > 0
      ? [
          {
            role: 'system',
            content:
              'You are a research assistant. Write a clear, accurate summary grounded in the provided sources. Cite ideas by source number [1], [2] where appropriate. If a claim is not in the sources, say so.',
          },
          {
            role: 'user',
            content: `Topic: ${topic}\n\nSources:\n${formatSourcesForPrompt(sources)}\n\nWrite a comprehensive summary.`,
          },
        ]
      : [
          {
            role: 'system',
            content:
              'You are a research assistant. No web sources were retrieved; answer from general knowledge and state limitations.',
          },
          {
            role: 'user',
            content: `Topic: ${topic}\n\nProvide a structured, helpful overview.`,
          },
        ];

  let summary = '';
  try {
    summary = (await chatCompletion(config.aiConfig, synthesisMessages)).trim();
  } catch {
    summary = '';
  }

  const result: ResearchResult = {
    topic,
    summary,
    sources,
    subQueries,
  };
  callbacks?.onComplete(result);
  return result;
}
