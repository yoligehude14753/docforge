import type { DocumentTree } from '@/lib/knowledge/parser/types';
import { TextEmbedder } from './embedder';
import { chunkDocument } from './chunker';
import { VectorStore, type SearchResult } from './vector-store';

function chunkToVectorMetadata(chunk: {
  metadata: {
    sourceFile: string;
    chapterPath: string;
    nodeType: string;
    parentId?: string;
  };
}) {
  return {
    sourceFile: chunk.metadata.sourceFile,
    chapterPath: chunk.metadata.chapterPath,
    nodeType: chunk.metadata.nodeType,
    parentId: chunk.metadata.parentId,
  };
}

interface SerializedKnowledgeRetriever {
  storeJson: string;
}

export class KnowledgeRetriever {
  private store: VectorStore;

  constructor() {
    this.store = new VectorStore(new TextEmbedder());
  }

  private rebuildCorpusVectors(): void {
    const kept = this.store.getAll();
    const texts = kept.map((e) => e.text);
    const embedder = new TextEmbedder();
    embedder.addDocuments(texts);
    this.store.setEmbedder(embedder);
    this.store.clear();
    for (const e of kept) {
      this.store.add(e.id, e.text, e.metadata);
    }
  }

  async indexDocument(doc: DocumentTree, sourceFile: string): Promise<number> {
    this.store.removeBySource(sourceFile);
    const chunks = chunkDocument(doc, sourceFile);
    if (chunks.length === 0) {
      this.rebuildCorpusVectors();
      return 0;
    }
    const existing = this.store.getAll();
    const allTexts = [...existing.map((e) => e.text), ...chunks.map((c) => c.text)];
    const embedder = new TextEmbedder();
    embedder.addDocuments(allTexts);
    this.store.setEmbedder(embedder);
    this.store.clear();
    for (const e of existing) {
      this.store.add(e.id, e.text, e.metadata);
    }
    for (const c of chunks) {
      this.store.add(c.id, c.text, chunkToVectorMetadata(c));
    }
    return chunks.length;
  }

  async search(query: string, topK?: number, minScore?: number): Promise<SearchResult[]> {
    return this.store.search(query, topK, minScore);
  }

  removeDocument(sourceFile: string): void {
    this.store.removeBySource(sourceFile);
    this.rebuildCorpusVectors();
  }

  getIndexedFiles(): string[] {
    const files = new Set<string>();
    for (const e of this.store.getAll()) {
      files.add(e.metadata.sourceFile);
    }
    return [...files].sort();
  }

  serialize(): string {
    const payload: SerializedKnowledgeRetriever = {
      storeJson: this.store.serialize(),
    };
    return JSON.stringify(payload);
  }

  static deserialize(json: string): KnowledgeRetriever {
    const payload = JSON.parse(json) as SerializedKnowledgeRetriever;
    const r = new KnowledgeRetriever();
    r.store = VectorStore.deserialize(payload.storeJson);
    return r;
  }
}
