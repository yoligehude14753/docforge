import { chatCompletion, streamChatCompletion } from '@/lib/ai/provider';
import type { AIConfig, StreamCallbacks } from '@/lib/ai/provider';

export async function refineSection(
  currentContent: string,
  userFeedback: string,
  aiConfig: AIConfig,
  callbacks?: Partial<StreamCallbacks>,
): Promise<string> {
  const system =
    'You are an expert editor for formal business and technical documents. Refine the section according to the user feedback while preserving overall structure, headings hierarchy, and professional tone unless the feedback explicitly asks to change them.';

  const user = `Current section:\n\n${currentContent}\n\n---\n\nUser feedback:\n${userFeedback}\n\nReturn the full revised section text only.`;

  const messages = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ];

  const useStream = Boolean(callbacks?.onToken);

  if (!useStream) {
    const text = await chatCompletion(aiConfig, messages);
    callbacks?.onComplete?.(text);
    return text;
  }

  return new Promise((resolve, reject) => {
    void streamChatCompletion(aiConfig, messages, {
      onToken: (token) => callbacks?.onToken?.(token),
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
