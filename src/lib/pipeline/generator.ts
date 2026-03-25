import { chatCompletion, streamChatCompletion } from '@/lib/ai/provider';
import type { AIConfig, StreamCallbacks } from '@/lib/ai/provider';
import type { OutlineSection } from './analyzer';
import type { SearchResult } from '@/lib/knowledge/rag/vector-store';

export interface GenerationContext {
  section: OutlineSection;
  ragResults: SearchResult[];
  previousSections: string[];
  documentType: string;
  userGuidance?: string;
}

function formatRagBlock(results: SearchResult[]): string {
  if (results.length === 0) return 'No retrieved reference passages.';
  return results
    .map((r, i) => {
      const meta = r.entry.metadata;
      const loc = [meta.sourceFile, meta.chapterPath].filter(Boolean).join(' / ');
      return `[Ref ${i + 1}] (${loc})\n${r.entry.text}`;
    })
    .join('\n\n---\n\n');
}

function formatPreviousSections(prev: string[]): string {
  if (prev.length === 0) return 'None yet.';
  return prev.map((p, i) => `--- Prior section ${i + 1} ---\n${p}`).join('\n\n');
}

function buildSectionPrompt(context: GenerationContext, mode: 'generate' | 'regenerate'): string {
  const { section, ragResults, previousSections, documentType, userGuidance } = context;
  const guidance =
    mode === 'regenerate' && userGuidance
      ? `\nUser feedback to apply:\n${userGuidance}\n`
      : userGuidance
        ? `\nAdditional user guidance:\n${userGuidance}\n`
        : '';

  return `Document type: ${documentType}

Current section to write:
- Title: ${section.title}
- Level: ${section.level}
- Description / intent: ${section.description}
${guidance}
Reference material (RAG):
${formatRagBlock(ragResults)}

Previously generated sections (for tone and continuity; do not repeat verbatim):
${formatPreviousSections(previousSections)}

Write the full body content for this section only. Use professional, clear language suitable for formal proposals and technical bids. Use headings only if they fit the section level. Do not add a title line that duplicates the section title unless appropriate.`;
}

async function runCompletion(
  systemPrompt: string,
  userPrompt: string,
  aiConfig: AIConfig,
  callbacks?: Partial<StreamCallbacks>,
): Promise<string> {
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ];

  const useStream = Boolean(callbacks?.onToken);

  if (!useStream) {
    const text = await chatCompletion(aiConfig, messages);
    callbacks?.onComplete?.(text);
    return text;
  }

  return new Promise((resolve, reject) => {
    let full = '';
    void streamChatCompletion(aiConfig, messages, {
      onToken: (token) => {
        full += token;
        callbacks?.onToken?.(token);
      },
      onComplete: (text) => {
        callbacks?.onComplete?.(text);
        resolve(text);
      },
      onError: (err) => {
        callbacks?.onError?.(err);
        reject(err);
      },
    });
  });
}

const SYSTEM_WRITER =
  'You are an expert professional document writer for bids, tenders, and technical proposals. You write precise, well-structured content that aligns with the outline and supplied reference material.';

export async function generateSection(
  context: GenerationContext,
  aiConfig: AIConfig,
  callbacks?: Partial<StreamCallbacks>,
): Promise<string> {
  const userPrompt = buildSectionPrompt(context, 'generate');
  return runCompletion(SYSTEM_WRITER, userPrompt, aiConfig, callbacks);
}

export async function regenerateSection(
  context: GenerationContext,
  feedback: string,
  aiConfig: AIConfig,
  callbacks?: Partial<StreamCallbacks>,
): Promise<string> {
  const ctx: GenerationContext = { ...context, userGuidance: feedback };
  const userPrompt = buildSectionPrompt(ctx, 'regenerate');
  const system = `${SYSTEM_WRITER} Revise the section according to the user feedback while keeping structure and tone consistent with the rest of the document.`;
  return runCompletion(system, userPrompt, aiConfig, callbacks);
}
