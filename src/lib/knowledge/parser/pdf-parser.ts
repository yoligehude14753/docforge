export interface PdfParseResult {
  text: string;
  pages: string[];
  metadata: Record<string, string>;
}

export async function parsePdf(buffer: ArrayBuffer): Promise<PdfParseResult> {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(buffer);

  const readable = extractReadableText(text);

  return {
    text: readable,
    pages: [readable],
    metadata: {},
  };
}

function extractReadableText(raw: string): string {
  const matches: string[] = [];
  const regex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const block = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj;
    while ((tj = tjRegex.exec(block)) !== null) {
      matches.push(tj[1]);
    }
  }
  return matches.join(' ') || '(PDF text extraction limited - upload .docx for best results)';
}
