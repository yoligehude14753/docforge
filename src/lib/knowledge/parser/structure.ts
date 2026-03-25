import type { DocumentNode, DocumentTree } from '@/lib/knowledge/parser/types';

export interface Chapter {
  title: string;
  level: number;
  content: DocumentNode[];
  children: Chapter[];
  path: string;
}

export function buildChapterTree(doc: DocumentTree): Chapter[] {
  const roots: Chapter[] = [];
  const stack: Chapter[] = [];
  const preamble: Chapter = {
    title: '',
    level: 0,
    content: [],
    children: [],
    path: '',
  };

  for (const node of doc.nodes) {
    if (node.type === 'heading' && node.level !== undefined) {
      const level = node.level;
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      const chapter: Chapter = {
        title: node.content,
        level,
        content: [],
        children: [],
        path: '',
      };
      if (stack.length === 0) {
        roots.push(chapter);
      } else {
        stack[stack.length - 1].children.push(chapter);
      }
      stack.push(chapter);
    } else {
      if (stack.length === 0) {
        preamble.content.push(node);
      } else {
        stack[stack.length - 1].content.push(node);
      }
    }
  }

  if (preamble.content.length > 0) {
    preamble.path = '0';
    assignPaths(roots, '');
    return [preamble, ...roots];
  }
  assignPaths(roots, '');
  return roots;
}

function assignPaths(chapters: Chapter[], prefix = ''): void {
  chapters.forEach((ch, i) => {
    const n = i + 1;
    ch.path = prefix ? `${prefix}.${n}` : String(n);
    assignPaths(ch.children, ch.path);
  });
}
