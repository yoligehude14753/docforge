export interface TextVector {
  terms: Map<string, number>;
  norm: number;
}

const CJK_RE = /[\u4e00-\u9fff]+/g;

const STOPWORDS = new Set([
  '的',
  '了',
  '是',
  '在',
  '和',
  '有',
  '不',
  '这',
  '中',
  '为',
  '以',
  '对',
  '等',
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
]);

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  const n = tokens.length || 1;
  for (const [t, c] of tf) {
    tf.set(t, c / n);
  }
  return tf;
}

function vectorNorm(terms: Map<string, number>): number {
  let s = 0;
  for (const w of terms.values()) {
    s += w * w;
  }
  return Math.sqrt(s) || 1;
}

export interface SerializedTextVector {
  terms: [string, number][];
  norm: number;
}

export interface SerializedTextEmbedder {
  docCount: number;
  docFreq: [string, number][];
}

export class TextEmbedder {
  private idf: Map<string, number> = new Map();
  private docCount = 0;
  private docFreq: Map<string, number> = new Map();

  addDocuments(texts: string[]): void {
    for (const raw of texts) {
      const tokens = this.tokenize(raw);
      if (tokens.length === 0) {
        continue;
      }
      this.docCount += 1;
      const seen = new Set<string>();
      for (const t of tokens) {
        if (seen.has(t)) {
          continue;
        }
        seen.add(t);
        this.docFreq.set(t, (this.docFreq.get(t) ?? 0) + 1);
      }
    }
    this.recomputeIdf();
  }

  private recomputeIdf(): void {
    if (this.docCount === 0) {
      this.idf.clear();
      return;
    }
    const N = this.docCount;
    this.idf.clear();
    for (const [term, df] of this.docFreq) {
      this.idf.set(term, Math.log(1 + N / (1 + df)));
    }
  }

  embed(text: string): TextVector {
    const tokens = this.tokenize(text);
    const tf = termFrequency(tokens);
    const terms = new Map<string, number>();
    for (const [t, f] of tf) {
      const idf = this.idf.get(t) ?? Math.log(1 + (this.docCount + 1) / 1);
      terms.set(t, f * idf);
    }
    const norm = vectorNorm(terms);
    return { terms, norm };
  }

  similarity(a: TextVector, b: TextVector): number {
    if (a.norm === 0 || b.norm === 0) {
      return 0;
    }
    let dot = 0;
    const [small, large] = a.terms.size <= b.terms.size ? [a, b] : [b, a];
    for (const [t, wa] of small.terms) {
      const wb = large.terms.get(t);
      if (wb !== undefined) {
        dot += wa * wb;
      }
    }
    return dot / (a.norm * b.norm);
  }

  private tokenize(text: string): string[] {
    const out: string[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    CJK_RE.lastIndex = 0;
    while ((m = CJK_RE.exec(text)) !== null) {
      const before = text.slice(last, m.index);
      out.push(...this.tokenizeEnglish(before));
      const cjk = m[0];
      for (let i = 0; i < cjk.length - 1; i++) {
        const bg = cjk.slice(i, i + 2);
        if (!STOPWORDS.has(bg)) {
          out.push(bg);
        }
      }
      last = m.index + cjk.length;
    }
    out.push(...this.tokenizeEnglish(text.slice(last)));
    return out;
  }

  private tokenizeEnglish(fragment: string): string[] {
    const words = fragment
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
      .filter((w) => w.length > 0 && !STOPWORDS.has(w));
    return words;
  }

  serialize(): string {
    const payload: SerializedTextEmbedder = {
      docCount: this.docCount,
      docFreq: [...this.docFreq.entries()],
    };
    return JSON.stringify(payload);
  }

  static deserialize(json: string): TextEmbedder {
    const payload = JSON.parse(json) as SerializedTextEmbedder;
    const e = new TextEmbedder();
    e.docCount = payload.docCount ?? 0;
    e.docFreq = new Map(payload.docFreq ?? []);
    e.recomputeIdf();
    return e;
  }
}

export function serializeTextVector(v: TextVector): SerializedTextVector {
  return { terms: [...v.terms.entries()], norm: v.norm };
}

export function deserializeTextVector(s: SerializedTextVector): TextVector {
  return { terms: new Map(s.terms), norm: s.norm };
}
