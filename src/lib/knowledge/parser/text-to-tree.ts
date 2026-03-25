import type { DocumentNode, DocumentTree } from './types';

/**
 * Converts plain text content into a minimal DocumentTree
 * suitable for indexing by KnowledgeRetriever.
 */
export function textToDocumentTree(
  text: string,
  sourceTitle?: string,
): DocumentTree {
  const lines = text.split(/\r?\n/);
  const nodes: DocumentNode[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
    } else {
      nodes.push({
        type: 'paragraph',
        content: trimmed,
      });
    }
  }

  return {
    nodes,
    metadata: { title: sourceTitle },
    styles: new Map(),
    images: new Map(),
  };
}
