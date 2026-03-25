import {
  TextEmbedder,
  deserializeTextVector,
  serializeTextVector,
  type TextVector,
} from './embedder';

export interface VectorEntry {
  id: string;
  text: string;
  vector: TextVector;
  metadata: {
    sourceFile: string;
    chapterPath: string;
    pageNumber?: number;
    nodeType: string;
    parentId?: string;
  };
}

export interface SearchResult {
  entry: VectorEntry;
  score: number;
}

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.1;

interface SerializedVectorEntry {
  id: string;
  text: string;
  vector: { terms: [string, number][]; norm: number };
  metadata: VectorEntry['metadata'];
}

interface SerializedVectorStore {
  embedderJson: string;
  entries: SerializedVectorEntry[];
}

export class VectorStore {
  private entries: Map<string, VectorEntry> = new Map();
  private embedder: TextEmbedder;

  constructor(embedder?: TextEmbedder) {
    this.embedder = embedder ?? new TextEmbedder();
  }

  getEmbedder(): TextEmbedder {
    return this.embedder;
  }

  setEmbedder(embedder: TextEmbedder): void {
    this.embedder = embedder;
  }

  clear(): void {
    this.entries.clear();
  }

  add(id: string, text: string, metadata: VectorEntry['metadata']): void {
    const vector = this.embedder.embed(text);
    this.entries.set(id, { id, text, vector, metadata });
  }

  search(query: string, topK: number = DEFAULT_TOP_K, minScore: number = DEFAULT_MIN_SCORE): SearchResult[] {
    const qv = this.embedder.embed(query);
    const scored: SearchResult[] = [];
    for (const entry of this.entries.values()) {
      const score = this.embedder.similarity(qv, entry.vector);
      if (score >= minScore) {
        scored.push({ entry, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  removeBySource(sourceFile: string): void {
    for (const [id, e] of [...this.entries.entries()]) {
      if (e.metadata.sourceFile === sourceFile) {
        this.entries.delete(id);
      }
    }
  }

  getAll(): VectorEntry[] {
    return [...this.entries.values()];
  }

  size(): number {
    return this.entries.size;
  }

  serialize(): string {
    const payload: SerializedVectorStore = {
      embedderJson: this.embedder.serialize(),
      entries: [...this.entries.values()].map((e) => ({
        id: e.id,
        text: e.text,
        vector: serializeTextVector(e.vector),
        metadata: e.metadata,
      })),
    };
    return JSON.stringify(payload);
  }

  static deserialize(json: string): VectorStore {
    const payload = JSON.parse(json) as SerializedVectorStore;
    const store = new VectorStore(TextEmbedder.deserialize(payload.embedderJson));
    for (const row of payload.entries ?? []) {
      store.entries.set(row.id, {
        id: row.id,
        text: row.text,
        vector: deserializeTextVector(row.vector),
        metadata: row.metadata,
      });
    }
    return store;
  }
}
