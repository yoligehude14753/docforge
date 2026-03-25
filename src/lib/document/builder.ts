import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  NumberFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Tab,
  TabStopPosition,
  TabStopType,
  TableOfContents,
  TextRun,
  type IParagraphOptions,
  type IStylesOptions,
} from 'docx';
import { saveAs } from 'file-saver';

import { FONT_FAMILIES, FONT_SIZES, PAGE } from '@/lib/document/styles';

export interface DocSection {
  title: string;
  level: 1 | 2 | 3 | 4;
  content: string;
  children?: DocSection[];
}

export interface DocConfig {
  title: string;
  subtitle?: string;
  author?: string;
  company?: string;
  date?: string;
  sections: DocSection[];
  includeToc?: boolean;
  includeCover?: boolean;
  headerText?: string;
  footerText?: string;
}

const HEADING_BY_LEVEL: Record<DocSection['level'], (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

function bodyTextRun(text: string): TextRun {
  return new TextRun({
    text,
    font: { name: FONT_FAMILIES.body, eastAsia: FONT_FAMILIES.body },
    size: FONT_SIZES.body,
  });
}

function parseContentToParagraphs(content: string): Paragraph[] {
  const blocks = content.split(/\n\n+/);
  const result: Paragraph[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    const normalBuf: string[] = [];

    const flushNormal = (): void => {
      if (normalBuf.length === 0) return;
      const text = normalBuf.join('\n');
      normalBuf.length = 0;
      result.push(new Paragraph({ children: [bodyTextRun(text)] }));
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (line === '') {
        flushNormal();
        continue;
      }

      const bullet = /^[-*]\s+(.+)$/.exec(line);
      const numbered = /^(\d+)\.\s+(.+)$/.exec(line);

      if (bullet) {
        flushNormal();
        result.push(
          new Paragraph({
            children: [bodyTextRun(bullet[1])],
            numbering: { reference: 'bidforge-bullet', level: 0 },
          }),
        );
      } else if (numbered) {
        flushNormal();
        result.push(
          new Paragraph({
            children: [bodyTextRun(numbered[2])],
            numbering: { reference: 'bidforge-numbered', level: 0 },
          }),
        );
      } else {
        normalBuf.push(line);
      }
    }
    flushNormal();
  }

  return result;
}

function sectionToElements(section: DocSection): Paragraph[] {
  const elements: Paragraph[] = [];
  elements.push(
    new Paragraph({
      text: section.title,
      heading: HEADING_BY_LEVEL[section.level],
    }),
  );
  elements.push(...parseContentToParagraphs(section.content));
  for (const child of section.children ?? []) {
    elements.push(...sectionToElements(child));
  }
  return elements;
}

function buildDocumentStyles(): IStylesOptions {
  return {
    default: {
      document: {
        run: {
          font: { name: FONT_FAMILIES.body, eastAsia: FONT_FAMILIES.body },
          size: FONT_SIZES.body,
        },
      },
      heading1: {
        run: {
          font: { name: FONT_FAMILIES.heading, eastAsia: FONT_FAMILIES.heading },
          bold: true,
          size: FONT_SIZES.heading1,
        },
      },
      heading2: {
        run: {
          font: { name: FONT_FAMILIES.heading, eastAsia: FONT_FAMILIES.heading },
          bold: true,
          size: FONT_SIZES.heading2,
        },
      },
      heading3: {
        run: {
          font: { name: FONT_FAMILIES.heading, eastAsia: FONT_FAMILIES.heading },
          bold: true,
          size: FONT_SIZES.heading3,
        },
      },
      heading4: {
        run: {
          font: { name: FONT_FAMILIES.heading, eastAsia: FONT_FAMILIES.heading },
          bold: true,
          size: FONT_SIZES.heading4,
        },
      },
    },
  };
}

function buildNumberingConfig() {
  return {
    config: [
      {
        reference: 'bidforge-bullet',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 },
              },
            },
          },
        ],
      },
      {
        reference: 'bidforge-numbered',
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 },
              },
            },
          },
        ],
      },
    ],
  };
}

function buildHeaderParagraph(headerText: string | undefined): Paragraph {
  const left = headerText?.trim() ?? '';
  const opts: IParagraphOptions = {
    tabStops: [
      {
        type: TabStopType.RIGHT,
        position: TabStopPosition.MAX,
      },
    ],
    children: [
      new TextRun({
        text: left,
        font: { name: FONT_FAMILIES.body, eastAsia: FONT_FAMILIES.body },
        size: FONT_SIZES.body,
      }),
      new Tab(),
      new TextRun({
        children: [PageNumber.CURRENT],
        font: { name: FONT_FAMILIES.body, eastAsia: FONT_FAMILIES.body },
        size: FONT_SIZES.body,
      }),
    ],
  };
  return new Paragraph(opts);
}

function buildFooterParagraph(footerText: string | undefined): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: footerText?.trim() ?? '',
        font: { name: FONT_FAMILIES.body, eastAsia: FONT_FAMILIES.body },
        size: FONT_SIZES.caption,
      }),
    ],
  });
}

function buildCoverParagraphs(config: DocConfig): Paragraph[] {
  const blocks: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 3200, after: 400 },
      children: [
        new TextRun({
          text: config.title,
          bold: true,
          font: { name: FONT_FAMILIES.heading, eastAsia: FONT_FAMILIES.heading },
          size: FONT_SIZES.title,
        }),
      ],
    }),
  ];

  if (config.subtitle?.trim()) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: config.subtitle.trim(),
            font: { name: FONT_FAMILIES.body, eastAsia: FONT_FAMILIES.body },
            size: FONT_SIZES.heading3,
          }),
        ],
      }),
    );
  }

  if (config.company?.trim()) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 200 },
        children: [
          new TextRun({
            text: config.company.trim(),
            font: { name: FONT_FAMILIES.body, eastAsia: FONT_FAMILIES.body },
            size: FONT_SIZES.body,
          }),
        ],
      }),
    );
  }

  if (config.date?.trim()) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: config.date.trim(),
            font: { name: FONT_FAMILIES.body, eastAsia: FONT_FAMILIES.body },
            size: FONT_SIZES.body,
          }),
        ],
      }),
    );
  }

  blocks.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
  );

  return blocks;
}

export async function buildDocument(config: DocConfig): Promise<Blob> {
  const children: (Paragraph | TableOfContents)[] = [];

  if (config.includeCover) {
    children.push(...buildCoverParagraphs(config));
  }

  if (config.includeToc) {
    children.push(
      new TableOfContents('目录', {
        hyperlink: true,
        headingStyleRange: '1-4',
      }),
    );
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    );
  }

  for (const section of config.sections) {
    children.push(...sectionToElements(section));
  }

  const doc = new Document({
    creator: config.author,
    title: config.title,
    styles: buildDocumentStyles(),
    numbering: buildNumberingConfig(),
    features: {
      updateFields: true,
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE.width,
              height: PAGE.height,
            },
            margin: {
              top: PAGE.marginTop,
              bottom: PAGE.marginBottom,
              left: PAGE.marginLeft,
              right: PAGE.marginRight,
            },
            pageNumbers: {
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        headers: {
          default: new Header({
            children: [buildHeaderParagraph(config.headerText)],
          }),
        },
        footers: {
          default: new Footer({
            children: [buildFooterParagraph(config.footerText)],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadDocument(config: DocConfig, filename: string): Promise<void> {
  const blob = await buildDocument(config);
  saveAs(blob, filename.endsWith('.docx') ? filename : `${filename}.docx`);
}
