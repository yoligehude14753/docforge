import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseDocx } from '@/lib/knowledge/parser/docx-deep';

function buildMinimalDocx(documentXml: string, extras?: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/document.xml', documentXml);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  if (extras) {
    for (const [path, content] of Object.entries(extras)) {
      zip.file(path, content);
    }
  }
  return zip.generateAsync({ type: 'arraybuffer' });
}

const wrapBody = (inner: string) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${inner}</w:body>
</w:document>`;

describe('parseDocx (OOXML deep parser)', () => {
  it('should return empty tree for a docx with no content', async () => {
    const buf = await buildMinimalDocx(wrapBody(''));
    const tree = await parseDocx(buf);
    expect(tree.nodes).toHaveLength(0);
    expect(tree.metadata).toBeDefined();
    expect(tree.styles).toBeDefined();
    expect(tree.images).toBeDefined();
  });

  it('should parse a simple paragraph', async () => {
    const xml = wrapBody(`
      <w:p>
        <w:r><w:t>Hello World</w:t></w:r>
      </w:p>`);
    const buf = await buildMinimalDocx(xml);
    const tree = await parseDocx(buf);
    expect(tree.nodes.length).toBeGreaterThanOrEqual(1);
    const para = tree.nodes.find((n) => n.type === 'paragraph');
    expect(para).toBeDefined();
    expect(para!.content).toBe('Hello World');
  });

  it('should detect heading styles', async () => {
    const xml = wrapBody(`
      <w:p>
        <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
        <w:r><w:t>Chapter One</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
        <w:r><w:t>Section 1.1</w:t></w:r>
      </w:p>`);
    const buf = await buildMinimalDocx(xml);
    const tree = await parseDocx(buf);
    const headings = tree.nodes.filter((n) => n.type === 'heading');
    expect(headings.length).toBe(2);
    expect(headings[0].level).toBe(1);
    expect(headings[0].content).toBe('Chapter One');
    expect(headings[1].level).toBe(2);
    expect(headings[1].content).toBe('Section 1.1');
  });

  it('should parse a simple table', async () => {
    const xml = wrapBody(`
      <w:tbl>
        <w:tr>
          <w:tc><w:p><w:r><w:t>Cell A</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Cell B</w:t></w:r></w:p></w:tc>
        </w:tr>
        <w:tr>
          <w:tc><w:p><w:r><w:t>Cell C</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:r><w:t>Cell D</w:t></w:r></w:p></w:tc>
        </w:tr>
      </w:tbl>`);
    const buf = await buildMinimalDocx(xml);
    const tree = await parseDocx(buf);
    const tables = tree.nodes.filter((n) => n.type === 'table');
    expect(tables.length).toBe(1);
    expect(tables[0].children).toBeDefined();
    expect(tables[0].children!.length).toBe(2);
  });

  it('should parse core metadata', async () => {
    const xml = wrapBody('<w:p><w:r><w:t>Test</w:t></w:r></w:p>');
    const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>Test Document</dc:title>
  <dc:creator>Test Author</dc:creator>
</cp:coreProperties>`;
    const buf = await buildMinimalDocx(xml, { 'docProps/core.xml': coreXml });
    const tree = await parseDocx(buf);
    expect(tree.metadata.title).toBe('Test Document');
    expect(tree.metadata.author).toBe('Test Author');
  });

  it('should handle multiple runs in a paragraph', async () => {
    const xml = wrapBody(`
      <w:p>
        <w:r><w:t xml:space="preserve">Part One </w:t></w:r>
        <w:r><w:t>Part Two</w:t></w:r>
      </w:p>`);
    const buf = await buildMinimalDocx(xml);
    const tree = await parseDocx(buf);
    const para = tree.nodes.find((n) => n.type === 'paragraph');
    expect(para).toBeDefined();
    expect(para!.content).toContain('Part One');
    expect(para!.content).toContain('Part Two');
  });

  it('should parse list items with numbering', async () => {
    const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;
    const xml = wrapBody(`
      <w:p>
        <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
        <w:r><w:t>Bullet item one</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
        <w:r><w:t>Bullet item two</w:t></w:r>
      </w:p>`);
    const buf = await buildMinimalDocx(xml, { 'word/numbering.xml': numberingXml });
    const tree = await parseDocx(buf);
    const listItems = tree.nodes.filter((n) => n.type === 'list-item');
    expect(listItems.length).toBe(2);
    expect(listItems[0].content).toBe('Bullet item one');
    expect(listItems[1].content).toBe('Bullet item two');
  });

  it('should return empty tree when document.xml is missing', async () => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types></Types>');
    const buf = await zip.generateAsync({ type: 'arraybuffer' });
    const tree = await parseDocx(buf);
    expect(tree.nodes).toHaveLength(0);
  });

  it('should parse styles.xml and populate style map', async () => {
    const xml = wrapBody('<w:p><w:r><w:t>Test</w:t></w:r></w:p>');
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr><w:b/><w:sz w:val="48"/></w:rPr>
  </w:style>
</w:styles>`;
    const buf = await buildMinimalDocx(xml, { 'word/styles.xml': stylesXml });
    const tree = await parseDocx(buf);
    expect(tree.styles.size).toBeGreaterThan(0);
    const h1Style = tree.styles.get('Heading1');
    expect(h1Style).toBeDefined();
    expect(h1Style!.bold).toBe(true);
    expect(h1Style!.fontSize).toBe(24);
  });
});
