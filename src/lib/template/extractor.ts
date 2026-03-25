import type { AIConfig } from '@/lib/ai/provider';
import { chatCompletion } from '@/lib/ai/provider';
import type { DocumentTree } from '@/lib/knowledge/parser/types';
import { buildChapterTree, type Chapter } from '@/lib/knowledge/parser/structure';
import type { Template, TemplateSection } from './registry';

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return fence ? fence[1].trim() : t;
}

function newCustomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTemplateSection(raw: unknown): TemplateSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  const level =
    typeof o.level === 'number' && Number.isFinite(o.level) ? Math.max(1, Math.floor(o.level)) : 1;
  const description = typeof o.description === 'string' ? o.description : '';
  let children: TemplateSection[] = [];
  if (Array.isArray(o.children)) {
    children = o.children.map(normalizeTemplateSection).filter((c): c is TemplateSection => c !== null);
  }
  if (!title) return null;
  return { title, level, description, children };
}

function parseTemplateFromAiJson(raw: string): Pick<Template, 'name' | 'description' | 'sections'> | null {
  try {
    const parsed: unknown = JSON.parse(stripJsonFence(raw));
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;

    const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : '';
    const description = typeof p.description === 'string' ? p.description : '';
    const sectionsRaw = Array.isArray(p.sections) ? p.sections : [];
    const sections = sectionsRaw.map(normalizeTemplateSection).filter((s): s is TemplateSection => s !== null);

    if (sections.length === 0) return null;
    return {
      name: name || '自定义模板',
      description,
      sections,
    };
  } catch {
    return null;
  }
}

function firstParagraphExcerpt(ch: Chapter, maxLen = 240): string {
  for (const node of ch.content) {
    if (node.type === 'paragraph') {
      const t = node.content.trim();
      if (t) return t.length > maxLen ? `${t.slice(0, maxLen - 3)}...` : t;
    }
  }
  return '';
}

function chaptersToTemplateSections(chapters: Chapter[]): TemplateSection[] {
  const out: TemplateSection[] = [];
  for (const ch of chapters) {
    const title = ch.title.trim();
    if (!title) {
      out.push(...chaptersToTemplateSections(ch.children));
      continue;
    }
    const level = Math.max(1, Math.floor(ch.level));
    const description = firstParagraphExcerpt(ch);
    const children = chaptersToTemplateSections(ch.children);
    out.push({ title, level, description, children });
  }
  return out;
}

function formatStructureSummary(chapters: Chapter[]): string {
  const lines: string[] = [];
  function walk(list: Chapter[], depth: number) {
    for (const ch of list) {
      if (!ch.title.trim()) {
        walk(ch.children, depth);
        continue;
      }
      const indent = '  '.repeat(depth);
      lines.push(`${indent}[H${ch.level}] ${ch.title}`);
      walk(ch.children, depth + 1);
    }
  }
  walk(chapters, 0);
  return lines.length > 0 ? lines.join('\n') : '(未检测到标题层级；将仅依据段落结构推断)';
}

function fallbackTemplateFromDocument(
  doc: DocumentTree,
  chapters: Chapter[],
  name?: string,
): Template {
  const sections = chaptersToTemplateSections(chapters);
  const docTitle = doc.metadata.title?.trim();
  return {
    id: newCustomId(),
    name: name?.trim() || docTitle || '自定义模板',
    description: docTitle ? `基于文档「${docTitle}」的章节结构生成` : '基于上传文档的章节结构生成',
    sections:
      sections.length > 0
        ? sections
        : [
            {
              title: '正文',
              level: 1,
              description: '文档未识别到标题；请手动拆章或重新上传带大纲的文档',
              children: [],
            },
          ],
    isBuiltin: false,
  };
}

const TEMPLATE_EXTRACT_SYSTEM = `You are a document structure analyst for BidForge. Given a hierarchical outline extracted from a document (heading titles and levels), produce a reusable bid/proposal-style template.

Rules:
- Generalize section titles: remove project-specific names, dates, and customer-specific wording; keep the logical outline.
- Each section must have: title (string), level (integer >= 1), description (short placeholder hint for writers), children (array, may be empty).
- Preserve the nesting and relative heading levels from the source when sensible; normalize levels so top-level sections use level 1.
- Respond with JSON only, no markdown fences, using this shape:
{"name":"...","description":"...","sections":[...]}

The "name" is a short human-readable template name (in the same language as the headings when possible). The "description" explains what the template is for.`;

export async function extractTemplateFromDocument(
  doc: DocumentTree,
  aiConfig: AIConfig,
  name?: string,
): Promise<Template> {
  const chapters = buildChapterTree(doc);
  const structureSummary = formatStructureSummary(chapters);

  const userPrompt = `Optional template name from user: ${name?.trim() || '(none)'}

Document structure (headings and nesting):
${structureSummary}

Return the JSON template as specified.`;

  try {
    const raw = await chatCompletion(aiConfig, [
      { role: 'system', content: TEMPLATE_EXTRACT_SYSTEM },
      { role: 'user', content: userPrompt },
    ]);
    const parsed = parseTemplateFromAiJson(raw);
    if (parsed) {
      return {
        id: newCustomId(),
        name: name?.trim() || parsed.name,
        description: parsed.description,
        sections: parsed.sections,
        isBuiltin: false,
      };
    }
  } catch {
    // fall through to chapter-tree conversion
  }

  return fallbackTemplateFromDocument(doc, chapters, name);
}
