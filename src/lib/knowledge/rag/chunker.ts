import type { DocumentNode, DocumentTree } from '@/lib/knowledge/parser/types';

export interface Chunk {
  id: string;
  text: string;
  metadata: {
    sourceFile: string;
    chapterPath: string;
    nodeType: string;
    parentId?: string;
    headingContext: string;
  };
}

const DEFAULT_MAX_CHUNK = 500;
const DEFAULT_OVERLAP = 50;

function headingStackToContext(stack: string[]): string {
  return stack.filter(Boolean).join(' > ');
}

function headingStackToPath(stack: string[]): string {
  return stack.filter(Boolean).join('/');
}

function updateHeadingStack(stack: string[], level: number, title: string): void {
  const L = Math.max(1, level);
  while (stack.length >= L) {
    stack.pop();
  }
  stack.push(title.trim());
}

function extractTableText(node: DocumentNode): string {
  if (node.type === 'table' && node.children?.length) {
    const rows: string[] = [];
    for (const row of node.children) {
      const cells: string[] = [];
      if (row.children?.length) {
        for (const cell of row.children) {
          cells.push(extractNodePlainText(cell));
        }
      } else {
        cells.push(row.content.trim());
      }
      rows.push(cells.join(' | '));
    }
    return rows.join('\n');
  }
  return node.content.trim();
}

function extractNodePlainText(node: DocumentNode): string {
  if (node.type === 'table') {
    return extractTableText(node);
  }
  if (node.type === 'image' || node.type === 'page-break') {
    return '';
  }
  if (node.children?.length) {
    return node.children.map(extractNodePlainText).filter(Boolean).join('\n');
  }
  return node.content.trim();
}

function flushBuffer(
  parts: string[],
  sourceFile: string,
  chapterPath: string,
  headingContext: string,
  nodeType: string,
  chunkIndex: { n: number },
  maxChunkSize: number,
  overlap: number,
  out: Chunk[],
): void {
  const merged = parts.join('\n').trim();
  parts.length = 0;
  if (!merged) {
    return;
  }
  if (merged.length <= maxChunkSize) {
    const id = `${sourceFile}${chunkIndex.n}`;
    chunkIndex.n += 1;
    out.push({
      id,
      text: merged,
      metadata: {
        sourceFile,
        chapterPath,
        nodeType,
        headingContext,
      },
    });
    return;
  }
  const paras = merged.split(/\n{2,}/);
  let buf = '';
  const pushSlice = (slice: string) => {
    let start = 0;
    while (start < slice.length) {
      let end = Math.min(slice.length, start + maxChunkSize);
      if (end < slice.length) {
        const cut = slice.lastIndexOf('\n', end);
        if (cut > start + maxChunkSize * 0.5) {
          end = cut;
        }
      }
      let piece = slice.slice(start, end).trim();
      if (piece) {
        const id = `${sourceFile}${chunkIndex.n}`;
        chunkIndex.n += 1;
        out.push({
          id,
          text: piece,
          metadata: {
            sourceFile,
            chapterPath,
            nodeType,
            headingContext,
          },
        });
      }
      if (end >= slice.length) {
        break;
      }
      start = Math.max(end - overlap, start + 1);
    }
  };
  for (const p of paras) {
    const next = buf ? `${buf}\n\n${p}` : p;
    if (next.length > maxChunkSize && buf) {
      pushSlice(buf);
      buf = p;
    } else {
      buf = next;
    }
  }
  if (buf) {
    pushSlice(buf);
  }
}

function walkNodes(
  nodes: DocumentNode[],
  sourceFile: string,
  headingStack: string[],
  options: { maxChunkSize: number; overlap: number },
  chunkIndex: { n: number },
  out: Chunk[],
): void {
  const { maxChunkSize, overlap } = options;
  let buffer: string[] = [];
  let bufferNodeType = 'paragraph';

  const flush = () => {
    flushBuffer(
      buffer,
      sourceFile,
      headingStackToPath(headingStack),
      headingStackToContext(headingStack),
      bufferNodeType,
      chunkIndex,
      maxChunkSize,
      overlap,
      out,
    );
    buffer = [];
    bufferNodeType = 'paragraph';
  };

  for (const node of nodes) {
    if (node.type === 'heading') {
      flush();
      const level = node.level ?? 1;
      updateHeadingStack(headingStack, level, node.content);
      continue;
    }

    if (node.type === 'page-break') {
      flush();
      continue;
    }

    if (node.type === 'image') {
      continue;
    }

    if (node.type === 'table') {
      flush();
      const t = extractTableText(node);
      if (t) {
        buffer.push(t);
        bufferNodeType = 'table';
        flush();
      }
      continue;
    }

    const text = extractNodePlainText(node);
    if (!text) {
      continue;
    }

    if (buffer.length === 0) {
      bufferNodeType = node.type;
    }
    buffer.push(text);
  }
  flush();
}

export function chunkDocument(
  doc: DocumentTree,
  sourceFile: string,
  options?: { maxChunkSize?: number; overlap?: number },
): Chunk[] {
  const maxChunkSize = options?.maxChunkSize ?? DEFAULT_MAX_CHUNK;
  const overlap = Math.max(0, options?.overlap ?? DEFAULT_OVERLAP);
  const headingStack: string[] = [];
  const chunkIndex = { n: 0 };
  const out: Chunk[] = [];
  walkNodes(doc.nodes, sourceFile, headingStack, { maxChunkSize, overlap }, chunkIndex, out);
  return out;
}
