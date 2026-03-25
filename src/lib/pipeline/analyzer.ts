import { chatCompletion } from '@/lib/ai/provider';
import type { AIConfig } from '@/lib/ai/provider';

export interface OutlineSection {
  title: string;
  level: number;
  description: string;
  children: OutlineSection[];
}

export interface AnalysisResult {
  requirements: Array<{
    id: string;
    text: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  outline: OutlineSection[];
  documentType: string;
  suggestedTitle: string;
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return fence ? fence[1].trim() : t;
}

function isPriority(v: unknown): v is 'high' | 'medium' | 'low' {
  return v === 'high' || v === 'medium' || v === 'low';
}

function normalizeOutlineSection(raw: unknown): OutlineSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title : '';
  const level = typeof o.level === 'number' && Number.isFinite(o.level) ? Math.max(1, Math.floor(o.level)) : 1;
  const description = typeof o.description === 'string' ? o.description : '';
  let children: OutlineSection[] = [];
  if (Array.isArray(o.children)) {
    children = o.children.map(normalizeOutlineSection).filter((c): c is OutlineSection => c !== null);
  }
  if (!title) return null;
  return { title, level, description, children };
}

function parseAnalysisJson(raw: string, fallbackDocType: string): AnalysisResult | null {
  try {
    const parsed: unknown = JSON.parse(stripJsonFence(raw));
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;

    const requirementsRaw = Array.isArray(p.requirements) ? p.requirements : [];
    const requirements: AnalysisResult['requirements'] = [];
    let i = 0;
    for (const row of requirementsRaw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const text = typeof r.text === 'string' ? r.text.trim() : '';
      if (!text) continue;
      const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `req-${++i}`;
      const category = typeof r.category === 'string' ? r.category : 'general';
      const priority = isPriority(r.priority) ? r.priority : 'medium';
      requirements.push({ id, text, category, priority });
    }

    const outlineRaw = Array.isArray(p.outline) ? p.outline : [];
    const outline = outlineRaw.map(normalizeOutlineSection).filter((s): s is OutlineSection => s !== null);

    const documentType =
      typeof p.documentType === 'string' && p.documentType.trim() ? p.documentType.trim() : fallbackDocType;
    const suggestedTitle =
      typeof p.suggestedTitle === 'string' && p.suggestedTitle.trim()
        ? p.suggestedTitle.trim()
        : 'Untitled document';

    return { requirements, outline, documentType, suggestedTitle };
  } catch {
    return null;
  }
}

export async function analyzeRequirements(
  requirementText: string,
  documentType: string,
  aiConfig: AIConfig,
  onStatus?: (status: string) => void,
): Promise<AnalysisResult> {
  onStatus?.('Analyzing requirements and building outline…');

  const messages = [
    {
      role: 'system' as const,
      content: `You are a bid and technical document analyst. Read the requirement text and output ONE JSON object only (no markdown fences), with this shape:
{
  "requirements": [ { "id": "string", "text": "string", "category": "string", "priority": "high"|"medium"|"low" } ],
  "outline": [ { "title": "string", "level": number, "description": "string", "children": [ ... same shape ... ] } ],
  "documentType": "string",
  "suggestedTitle": "string"
}
Use concise requirement items. Outline levels start at 1 for top sections. Mirror the intended document structure.`,
    },
    {
      role: 'user' as const,
      content: `Declared document type: ${documentType}\n\nRequirement / tender excerpt:\n\n${requirementText}`,
    },
  ];

  let raw = '';
  try {
    raw = await chatCompletion(aiConfig, messages);
  } catch {
    raw = '';
  }

  const parsed = parseAnalysisJson(raw, documentType);
  if (parsed) {
    onStatus?.('Analysis complete.');
    return parsed;
  }

  onStatus?.('Analysis failed to parse; returning minimal structure.');
  return {
    requirements: [
      {
        id: 'req-1',
        text: requirementText.slice(0, 2000) || '(empty)',
        category: 'general',
        priority: 'medium',
      },
    ],
    outline: [
      {
        title: '1. Overview',
        level: 1,
        description: 'Introduction and scope',
        children: [],
      },
    ],
    documentType,
    suggestedTitle: 'Draft document',
  };
}
