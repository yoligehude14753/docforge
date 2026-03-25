export interface SearchConfig {
  provider: 'tavily' | 'bing';
  apiKey: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

const DEFAULT_MAX_RESULTS = 5;

async function searchTavily(
  query: string,
  apiKey: string,
  maxResults: number,
): Promise<WebSearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: 'basic',
      include_answer: false,
      api_key: apiKey,
    }),
  });
  if (!res.ok) return [];
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const out: WebSearchResult[] = [];
  for (const row of results) {
    if (!row || typeof row !== 'object') continue;
    const r = row as { title?: unknown; url?: unknown; content?: unknown };
    const title = typeof r.title === 'string' ? r.title : '';
    const url = typeof r.url === 'string' ? r.url : '';
    const content = typeof r.content === 'string' ? r.content : '';
    if (!url && !title) continue;
    out.push({
      title: title || url,
      url: url || '',
      snippet: content.slice(0, 500),
      content: content || undefined,
    });
  }
  return out;
}

async function searchBing(
  query: string,
  apiKey: string,
  maxResults: number,
): Promise<WebSearchResult[]> {
  const q = encodeURIComponent(query);
  const count = Math.min(Math.max(maxResults, 1), 50);
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${q}&count=${count}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
  });
  if (!res.ok) return [];
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  const webPages = (data as { webPages?: { value?: unknown } }).webPages;
  const value = webPages?.value;
  if (!Array.isArray(value)) return [];
  const out: WebSearchResult[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const r = row as { name?: unknown; url?: unknown; snippet?: unknown };
    const title = typeof r.name === 'string' ? r.name : '';
    const pageUrl = typeof r.url === 'string' ? r.url : '';
    const snippet = typeof r.snippet === 'string' ? r.snippet : '';
    if (!pageUrl && !title) continue;
    out.push({
      title: title || pageUrl,
      url: pageUrl || '',
      snippet,
    });
  }
  return out;
}

/**
 * Web search via Tavily or Bing using fetch. On network or parse errors, returns an empty array.
 */
export async function webSearch(
  query: string,
  config: SearchConfig,
  maxResults?: number,
): Promise<WebSearchResult[]> {
  const limit = maxResults ?? DEFAULT_MAX_RESULTS;
  const key = config.apiKey?.trim();
  if (!key) return [];

  try {
    if (config.provider === 'tavily') {
      return await searchTavily(query, key, limit);
    }
    if (config.provider === 'bing') {
      return await searchBing(query, key, limit);
    }
  } catch {
    return [];
  }
  return [];
}
