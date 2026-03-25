import { describe, it, expect } from 'vitest';
import { parsePdf } from '@/lib/knowledge/parser/pdf-parser';

function textToBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

describe('parsePdf', () => {
  it('should return fallback message for empty buffer', async () => {
    const result = await parsePdf(textToBuffer(''));
    expect(result.text).toContain('PDF text extraction limited');
    expect(result.pages).toHaveLength(1);
    expect(result.metadata).toEqual({});
  });

  it('should extract text from PDF BT/ET blocks', async () => {
    const pdfLike = `
      %PDF-1.4
      BT
      (Hello from PDF) Tj
      ET
      BT
      (Another line) Tj
      ET
    `;
    const result = await parsePdf(textToBuffer(pdfLike));
    expect(result.text).toContain('Hello from PDF');
    expect(result.text).toContain('Another line');
  });

  it('should handle multiple Tj operators in a single BT/ET block', async () => {
    const pdfLike = `
      BT
      (First) Tj
      (Second) Tj
      (Third) Tj
      ET
    `;
    const result = await parsePdf(textToBuffer(pdfLike));
    expect(result.text).toContain('First');
    expect(result.text).toContain('Second');
    expect(result.text).toContain('Third');
  });

  it('should return fallback when no BT/ET blocks found', async () => {
    const result = await parsePdf(textToBuffer('plain text without PDF structure'));
    expect(result.text).toContain('PDF text extraction limited');
  });

  it('should return pages array with one entry', async () => {
    const pdfLike = 'BT (Page content) Tj ET';
    const result = await parsePdf(textToBuffer(pdfLike));
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]).toBe(result.text);
  });
});
