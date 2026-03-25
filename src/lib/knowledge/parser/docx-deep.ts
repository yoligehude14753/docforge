import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

import type {
  DocumentNode,
  DocumentTree,
  ParseOptions,
  StyleInfo,
} from '@/lib/knowledge/parser/types';

const TEXT = '#text';

const orderedParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  preserveOrder: true,
  trimValues: true,
});

const flatParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  preserveOrder: false,
  trimValues: true,
});

function ensureArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function stripAttrPrefix(key: string, prefix = '@_'): string {
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

function getAttrs(obj: unknown): Record<string, string> {
  if (!obj || typeof obj !== 'object') return {};
  const o = obj as Record<string, unknown>;
  const raw = o[':@'];
  if (raw && typeof raw === 'object') {
    const out: Record<string, string> = {};
    for (const k of Object.keys(raw)) {
      const v = (raw as Record<string, unknown>)[k];
      out[stripAttrPrefix(k)] = v === undefined || v === null ? '' : String(v);
    }
    return out;
  }
  const out: Record<string, string> = {};
  for (const k of Object.keys(o)) {
    if (k === TEXT || k.startsWith('#')) continue;
    if (k.startsWith('@_')) {
      out[stripAttrPrefix(k)] = String(o[k] ?? '');
    }
  }
  return out;
}

function attrVal(attrs: Record<string, string>, ...names: string[]): string | undefined {
  for (const n of names) {
    if (attrs[n] !== undefined && attrs[n] !== '') return attrs[n];
  }
  return undefined;
}

function orderedKeys(item: unknown): string[] {
  if (!item || typeof item !== 'object') return [];
  return Object.keys(item as object).filter((k) => k !== ':@' && k !== TEXT);
}

function getOrderedChildren(item: unknown): unknown[] {
  if (!item || typeof item !== 'object') return [];
  const keys = orderedKeys(item);
  if (keys.length !== 1) return [];
  const k = keys[0];
  const v = (item as Record<string, unknown>)[k];
  return ensureArray(v as unknown[] | undefined);
}

function findOrderedSegment(children: unknown[], tag: string): unknown[] | undefined {
  for (const seg of children) {
    if (!seg || typeof seg !== 'object') continue;
    const o = seg as Record<string, unknown>;
    if (tag in o) {
      const v = o[tag];
      return ensureArray(v as unknown[] | undefined);
    }
  }
  return undefined;
}

function styleToHeadingLevel(styleVal: string | undefined): number | null {
  if (!styleVal) return null;
  const s = String(styleVal).trim();
  const m =
    /heading\s*(\d+)/i.exec(s) ||
    /标题\s*(\d+)/.exec(s) ||
    /^h(\d)$/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n)) return Math.min(6, Math.max(1, n));
  }
  const zh = s.match(/标题\s*([1-6])/);
  if (zh) return parseInt(zh[1], 10);
  return null;
}

function jcToAlign(
  jc: string | undefined,
): 'left' | 'center' | 'right' | 'justify' | undefined {
  if (!jc) return undefined;
  const j = jc.toLowerCase();
  if (j === 'center') return 'center';
  if (j === 'right') return 'right';
  if (j === 'both' || j === 'distribute') return 'justify';
  if (j === 'left') return 'left';
  return undefined;
}

function isBoldOn(bAttrs: Record<string, string>): boolean {
  const v = attrVal(bAttrs, 'val');
  if (v === undefined || v === '' || v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false' || v === 'off') return false;
  return true;
}

function parseRunStyle(runChildren: unknown[]): StyleInfo {
  const style: StyleInfo = {};
  const rPrSeg = findOrderedSegment(runChildren, 'rPr');
  if (!rPrSeg) return style;
  for (const part of rPrSeg) {
    if (!part || typeof part !== 'object') continue;
    const key = orderedKeys(part)[0];
    if (!key) continue;
    if (key === 'b' || key === 'bCs') {
      style.bold = isBoldOn(getAttrs(part));
    } else if (key === 'i' || key === 'iCs') {
      const ia = getAttrs(part);
      const v = attrVal(ia, 'val');
      style.italic = v === undefined || v === '' || v === '1' || v === 'true';
    } else if (key === 'sz' || key === 'szCs') {
      const halfPoints = attrVal(getAttrs(part), 'val');
      if (halfPoints) {
        const hp = parseInt(halfPoints, 10);
        if (!Number.isNaN(hp)) style.fontSize = hp / 2;
      }
    } else if (key === 'color') {
      const c = attrVal(getAttrs(part), 'val');
      if (c) style.color = c.startsWith('#') ? c : `#${c}`;
    } else if (key === 'rFonts') {
      const a = getAttrs(part);
      const font = attrVal(a, 'ascii', 'hAnsi', 'eastAsia');
      if (font) style.fontFamily = font;
    }
  }
  return style;
}

function collectRunText(runChildren: unknown[]): string {
  let s = '';
  for (const seg of runChildren) {
    if (!seg || typeof seg !== 'object') continue;
    const key = orderedKeys(seg)[0];
    if (key === 't') {
      const inner = getOrderedChildren(seg);
      for (const t of inner) {
        if (typeof t === 'string') s += t;
        else if (t && typeof t === 'object' && TEXT in (t as object)) {
          s += String((t as Record<string, unknown>)[TEXT]);
        }
      }
    } else if (key === 'tab') {
      s += '\t';
    } else if (key === 'br') {
      const a = getAttrs(seg);
      if (attrVal(a, 'type') === 'page') {
        /* handled at paragraph level */
      } else {
        s += '\n';
      }
    }
  }
  return s;
}

function findEmbedRIdInNode(node: unknown): string | undefined {
  if (node === null || node === undefined) return undefined;
  if (Array.isArray(node)) {
    for (const x of node) {
      const id = findEmbedRIdInNode(x);
      if (id) return id;
    }
    return undefined;
  }
  if (typeof node !== 'object') return undefined;
  const attrs = getAttrs(node);
  for (const k of Object.keys(attrs)) {
    const lk = k.toLowerCase();
    if (lk === 'embed' || lk.endsWith('embed')) {
      const v = attrs[k];
      if (v && /^rId\d+/i.test(v)) return v;
    }
  }
  for (const k of Object.keys(node as object)) {
    if (k === ':@') continue;
    const v = (node as Record<string, unknown>)[k];
    const id = findEmbedRIdInNode(v);
    if (id) return id;
  }
  return undefined;
}

function paragraphHasPageBreak(pChildren: unknown[]): boolean {
  for (const seg of pChildren) {
    if (!seg || typeof seg !== 'object') continue;
    const key = orderedKeys(seg)[0];
    if (key === 'r') {
      const runs = getOrderedChildren(seg);
      for (const r of runs) {
        const rk = r && typeof r === 'object' ? orderedKeys(r)[0] : undefined;
        if (rk === 'br') {
          const a = getAttrs(r);
          if (attrVal(a, 'type') === 'page') return true;
        }
      }
    }
    if (key === 'lastRenderedPageBreak') return true;
  }
  return false;
}

function extractImageRIdsFromParagraph(pChildren: unknown[]): string[] {
  const ids: string[] = [];
  for (const seg of pChildren) {
    if (!seg || typeof seg !== 'object') continue;
    const key = orderedKeys(seg)[0];
    if (key === 'r') {
      const runs = getOrderedChildren(seg);
      for (const r of runs) {
        const runKids = getOrderedChildren(r);
        for (const rk of runKids) {
          if (!rk || typeof rk !== 'object') continue;
          const rkName = orderedKeys(rk)[0];
          if (rkName === 'drawing' || rkName === 'pict') {
            const id = findEmbedRIdInNode(rk);
            if (id) ids.push(id);
          }
        }
      }
    }
  }
  return ids;
}

interface ParagraphBits {
  text: string;
  style: StyleInfo;
  numId?: string;
  ilvl?: string;
  pStyleName?: string;
  pageBreak: boolean;
  imageRIds: string[];
}

function parseParagraphOrdered(pChildren: unknown[]): ParagraphBits {
  const bits: ParagraphBits = {
    text: '',
    style: {},
    pageBreak: paragraphHasPageBreak(pChildren),
    imageRIds: extractImageRIdsFromParagraph(pChildren),
  };
  const pPrSeg = findOrderedSegment(pChildren, 'pPr');
  if (pPrSeg) {
    for (const part of pPrSeg) {
      if (!part || typeof part !== 'object') continue;
      const key = orderedKeys(part)[0];
      if (key === 'pStyle') {
        const v = attrVal(getAttrs(part), 'val');
        if (v) bits.pStyleName = v;
      } else if (key === 'jc') {
        const j = attrVal(getAttrs(part), 'val');
        const al = jcToAlign(j);
        if (al) bits.style.alignment = al;
      } else if (key === 'numPr') {
        const inner = getOrderedChildren(part);
        for (const np of inner) {
          if (!np || typeof np !== 'object') continue;
          const nk = orderedKeys(np)[0];
          if (nk === 'ilvl') {
            bits.ilvl = attrVal(getAttrs(np), 'val');
          } else if (nk === 'numId') {
            bits.numId = attrVal(getAttrs(np), 'val');
          }
        }
      }
    }
  }
  let text = '';
  for (const seg of pChildren) {
    if (!seg || typeof seg !== 'object') continue;
    const key = orderedKeys(seg)[0];
    if (key === 'r') {
      const runs = getOrderedChildren(seg);
      const rs = parseRunStyle(runs);
      const rt = collectRunText(runs);
      if (rt) {
        text += rt;
        if (rs.bold) bits.style.bold = true;
        if (rs.italic) bits.style.italic = true;
        if (rs.fontSize !== undefined) bits.style.fontSize = rs.fontSize;
        if (rs.fontFamily) bits.style.fontFamily = rs.fontFamily;
        if (rs.color) bits.style.color = rs.color;
      }
    }
  }
  bits.text = text;
  if (bits.pStyleName) bits.style.styleName = bits.pStyleName;
  return bits;
}

function parseRelationships(xml: string): Map<string, { target: string; type: string }> {
  const map = new Map<string, { target: string; type: string }>();
  if (!xml.trim()) return map;
  const doc = flatParser.parse(xml) as Record<string, unknown>;
  const root = (doc.Relationships ?? doc.relationships) as Record<string, unknown> | undefined;
  if (!root) return map;
  const rel = root.Relationship ?? root.relationship;
  for (const r of ensureArray(rel as object | object[] | undefined)) {
    if (!r || typeof r !== 'object') continue;
    const a = getAttrs(r);
    const id = attrVal(a, 'Id');
    const target = attrVal(a, 'Target');
    const type = attrVal(a, 'Type');
    if (id && target) map.set(id, { target, type: type ?? '' });
  }
  return map;
}

function parseCoreMetadata(xml: string): DocumentTree['metadata'] {
  const meta: DocumentTree['metadata'] = {};
  if (!xml.trim()) return meta;
  const doc = flatParser.parse(xml) as Record<string, unknown>;
  const core = (doc.coreProperties ??
    doc['cp:coreProperties'] ??
    Object.values(doc).find((v) => v && typeof v === 'object' && !Array.isArray(v))) as
    | Record<string, unknown>
    | undefined;
  if (!core) return meta;
  const pick = (v: unknown): string | undefined => {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object' && TEXT in (v as object)) {
      return String((v as Record<string, unknown>)[TEXT]);
    }
    return undefined;
  };
  const pickKey = (obj: Record<string, unknown>, ...keys: string[]) => {
    for (const k of keys) {
      const v = obj[k];
      const p = pick(v);
      if (p) return p;
    }
    return undefined;
  };
  meta.title = pickKey(core, 'title', 'dc:title');
  meta.author = pickKey(core, 'creator', 'dc:creator');
  meta.created = pickKey(core, 'created', 'dcterms:created');
  meta.modified = pickKey(core, 'modified', 'dcterms:modified');
  return meta;
}

function parseStylesXml(xml: string, extract: boolean): Map<string, StyleInfo> {
  const styles = new Map<string, StyleInfo>();
  if (!extract || !xml.trim()) return styles;
  const doc = flatParser.parse(xml) as Record<string, unknown>;
  const root = doc.styles as Record<string, unknown> | undefined;
  if (!root) return styles;
  const styleArr = ensureArray(root.style as object | object[] | undefined);
  for (const st of styleArr) {
    if (!st || typeof st !== 'object') continue;
    const s = st as Record<string, unknown>;
    const sid = attrVal(getAttrs(s), 'styleId');
    if (!sid) continue;
    const info: StyleInfo = {};
    const nameObj = s.name as Record<string, unknown> | undefined;
    if (nameObj) {
      const nv = nameObj['@_val'] ?? nameObj.val;
      if (typeof nv === 'string') info.styleName = nv;
    }
    const pPr = s.pPr as Record<string, unknown> | undefined;
    if (pPr) {
      const jc = pPr.jc as Record<string, unknown> | undefined;
      if (jc) {
        const j = (jc['@_val'] ?? jc.val) as string | undefined;
        const al = jcToAlign(j);
        if (al) info.alignment = al;
      }
    }
    const rPr = s.rPr as Record<string, unknown> | undefined;
    if (rPr) {
      if (rPr.b !== undefined || rPr.bCs !== undefined) info.bold = true;
      if (rPr.i !== undefined || rPr.iCs !== undefined) info.italic = true;
      const sz = (rPr.sz ?? rPr.szCs) as Record<string, unknown> | undefined;
      if (sz) {
        const v = sz['@_val'] ?? sz.val;
        if (v !== undefined) {
          const hp = parseInt(String(v), 10);
          if (!Number.isNaN(hp)) info.fontSize = hp / 2;
        }
      }
      const col = rPr.color as Record<string, unknown> | undefined;
      if (col) {
        const c = col['@_val'] ?? col.val;
        if (c) info.color = String(c).startsWith('#') ? String(c) : `#${c}`;
      }
      const rf = rPr.rFonts as Record<string, unknown> | undefined;
      if (rf) {
        const font =
          (rf['@_ascii'] ?? rf['@_hAnsi'] ?? rf['@_eastAsia']) as string | undefined;
        if (font) info.fontFamily = font;
      }
    }
    styles.set(sid, info);
  }
  return styles;
}

function resolveWordPath(target: string): string {
  const t = target.replace(/^\.\//, '');
  if (t.startsWith('word/')) return t;
  if (t.startsWith('/word/')) return t.slice(1);
  if (t.startsWith('/')) return t.slice(1);
  return `word/${t.replace(/^\.\.\//, '')}`;
}

interface NumberingMaps {
  numIdToAbstract: Map<string, string>;
  abstractLevelFmt: Map<string, Map<string, string>>;
}

function parseNumberingXml(xml: string): NumberingMaps {
  const numIdToAbstract = new Map<string, string>();
  const abstractLevelFmt = new Map<string, Map<string, string>>();
  if (!xml.trim()) return { numIdToAbstract, abstractLevelFmt };
  const doc = flatParser.parse(xml) as Record<string, unknown>;
  const numbering = doc.numbering as Record<string, unknown> | undefined;
  if (!numbering) return { numIdToAbstract, abstractLevelFmt };

  for (const an of ensureArray(numbering.abstractNum as object[])) {
    if (!an || typeof an !== 'object') continue;
    const anRec = an as Record<string, unknown>;
    const anid = attrVal(getAttrs(an), 'abstractNumId');
    if (!anid) continue;
    const fmtMap = new Map<string, string>();
    for (const lvl of ensureArray(anRec.lvl as object[])) {
      if (!lvl || typeof lvl !== 'object') continue;
      const ilvl = attrVal(getAttrs(lvl), 'ilvl');
      const numFmt = (lvl as Record<string, unknown>).numFmt as Record<string, unknown> | undefined;
      const fmt = numFmt ? attrVal(getAttrs(numFmt), 'val') : undefined;
      if (ilvl && fmt) fmtMap.set(ilvl, fmt);
    }
    abstractLevelFmt.set(anid, fmtMap);
  }

  for (const num of ensureArray(numbering.num as object[])) {
    if (!num || typeof num !== 'object') continue;
    const numId = attrVal(getAttrs(num), 'numId');
    const abstractNumId = (num as Record<string, unknown>).abstractNumId as Record<string, unknown> | undefined;
    const abstractRef = abstractNumId ? attrVal(getAttrs(abstractNumId), 'val') : undefined;
    if (numId && abstractRef) numIdToAbstract.set(numId, abstractRef);
  }
  return { numIdToAbstract, abstractLevelFmt };
}

function mimeFromPath(p: string): string {
  const ext = p.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    emf: 'image/x-emf',
    wmf: 'image/x-wmf',
    svg: 'image/svg+xml',
  };
  return map[ext] ?? 'application/octet-stream';
}

async function loadImageBase64(
  zip: JSZip,
  rels: Map<string, { target: string; type: string }>,
  rId: string,
  maxBytes: number,
): Promise<{ name: string; data: string } | null> {
  const rel = rels.get(rId);
  if (!rel) return null;
  if (!/image|officeDocument.*image|spreadsheetml.*image/i.test(rel.type) && !/media\//i.test(rel.target)) {
    /* still try if path looks like media */
    if (!/\.(png|jpe?g|gif|webp|bmp|emf|wmf)$/i.test(rel.target)) return null;
  }
  const path = resolveWordPath(rel.target);
  const file = zip.file(path);
  if (!file) return null;
  const buf = await file.async('uint8array');
  if (buf.byteLength > maxBytes) return null;
  const base64 = uint8ToBase64(buf);
  const name = path.split('/').pop() ?? rId;
  const mime = mimeFromPath(path);
  return { name, data: `data:${mime};base64,${base64}` };
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function getBodyOrderedChildren(orderedRoot: unknown[]): unknown[] {
  for (const item of orderedRoot) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (!('document' in o)) continue;
    const docKids = ensureArray(o.document as unknown[]);
    for (const d of docKids) {
      if (!d || typeof d !== 'object') continue;
      const d2 = d as Record<string, unknown>;
      if ('body' in d2) {
        return ensureArray(d2.body as unknown[]);
      }
    }
  }
  return [];
}

function parseTable(tblChildren: unknown[]): DocumentNode {
  const rows: DocumentNode[] = [];
  for (const seg of tblChildren) {
    if (!seg || typeof seg !== 'object') continue;
    const key = orderedKeys(seg)[0];
    if (key !== 'tr') continue;
    const trKids = getOrderedChildren(seg);
    const cells: DocumentNode[] = [];
    for (const tcSeg of trKids) {
      if (!tcSeg || typeof tcSeg !== 'object') continue;
      const tk = orderedKeys(tcSeg)[0];
      if (tk !== 'tc') continue;
      const tcKids = getOrderedChildren(tcSeg);
      let gridSpan = '1';
      let vMerge: string | undefined;
      const tcPr = findOrderedSegment(tcKids, 'tcPr');
      if (tcPr) {
        for (const pr of tcPr) {
          if (!pr || typeof pr !== 'object') continue;
          const pk = orderedKeys(pr)[0];
          if (pk === 'gridSpan') {
            gridSpan = attrVal(getAttrs(pr), 'val') ?? '1';
          } else if (pk === 'vMerge') {
            vMerge = attrVal(getAttrs(pr), 'val') ?? 'continue';
          }
        }
      }
      const cellParagraphs: DocumentNode[] = [];
      for (const inner of tcKids) {
        if (!inner || typeof inner !== 'object') continue;
        const ik = orderedKeys(inner)[0];
        if (ik === 'p') {
          const pKids = getOrderedChildren(inner);
          const bits = parseParagraphOrdered(pKids);
          cellParagraphs.push({
            type: 'paragraph',
            content: bits.text,
            style: Object.keys(bits.style).length ? bits.style : undefined,
          });
        }
      }
      const cellText = cellParagraphs.map((p) => p.content).join('\n').trim();
      const cellMeta: Record<string, string> = {
        nodeRole: 'table-cell',
        gridSpan,
      };
      if (vMerge !== undefined) cellMeta.vMerge = vMerge;
      cells.push({
        type: 'paragraph',
        content: cellText,
        metadata: cellMeta,
        children: cellParagraphs.length ? cellParagraphs : undefined,
      });
    }
    rows.push({
      type: 'paragraph',
      content: '',
      metadata: { nodeRole: 'table-row' },
      children: cells,
    });
  }
  return {
    type: 'table',
    content: '',
    children: rows,
  };
}

async function walkBody(
  bodyChildren: unknown[],
  ctx: {
    zip: JSZip;
    rels: Map<string, { target: string; type: string }>;
    styles: Map<string, StyleInfo>;
    images: Map<string, string>;
    numbering: NumberingMaps;
    options: Required<ParseOptions>;
  },
  out: DocumentNode[],
): Promise<void> {
  const { zip, rels, styles, images, numbering, options } = ctx;
  for (const block of bodyChildren) {
    if (!block || typeof block !== 'object') continue;
    const key = orderedKeys(block)[0];
    if (key === TEXT) continue;
    if (key === 'p') {
      const pKids = getOrderedChildren(block);
      const bits = parseParagraphOrdered(pKids);
      if (bits.pageBreak) {
        out.push({ type: 'page-break', content: '' });
      }
      const mergedStyle: StyleInfo = {
        ...(bits.pStyleName ? styles.get(bits.pStyleName) : {}),
        ...bits.style,
      };
      if (bits.pStyleName) mergedStyle.styleName = bits.pStyleName;

      const headingLevel = styleToHeadingLevel(bits.pStyleName);

      if (options.extractImages) {
        for (const rid of bits.imageRIds) {
          const img = await loadImageBase64(zip, rels, rid, options.maxImageSize);
          if (img) {
            images.set(img.name, img.data);
            out.push({
              type: 'image',
              content: '',
              imageData: img.data,
              imageName: img.name,
              metadata: { rId: rid },
            });
          }
        }
      }

      const hasNum = bits.numId !== undefined;
      const listLevel = bits.ilvl !== undefined ? parseInt(bits.ilvl, 10) : 0;

      if (headingLevel !== null) {
        out.push({
          type: 'heading',
          level: headingLevel,
          content: bits.text,
          style: Object.keys(mergedStyle).length ? mergedStyle : undefined,
        });
      } else if (hasNum) {
        const ilvlKey = bits.ilvl ?? '0';
        const abstractNumId =
          bits.numId !== undefined ? numbering.numIdToAbstract.get(bits.numId) : undefined;
        const numFmt =
          abstractNumId !== undefined
            ? numbering.abstractLevelFmt.get(abstractNumId)?.get(ilvlKey)
            : undefined;
        out.push({
          type: 'list-item',
          level: Number.isNaN(listLevel) ? 0 : listLevel,
          content: bits.text,
          style: Object.keys(mergedStyle).length ? mergedStyle : undefined,
          metadata: {
            numId: bits.numId ?? '',
            ilvl: ilvlKey,
            ...(abstractNumId ? { abstractNumId } : {}),
            ...(numFmt ? { numFmt } : {}),
          },
        });
      } else {
        out.push({
          type: 'paragraph',
          content: bits.text,
          style: Object.keys(mergedStyle).length ? mergedStyle : undefined,
        });
      }
    } else if (key === 'tbl') {
      const tblKids = getOrderedChildren(block);
      out.push(parseTable(tblKids));
    } else if (key === 'sectPr') {
      /* section properties — skip */
    }
  }
}

const defaultOptions: Required<ParseOptions> = {
  extractImages: true,
  extractStyles: true,
  maxImageSize: 8 * 1024 * 1024,
};

export async function parseDocx(buffer: ArrayBuffer, options?: ParseOptions): Promise<DocumentTree> {
  const opts = { ...defaultOptions, ...options };
  const zip = await JSZip.loadAsync(buffer);

  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    return {
      nodes: [],
      metadata: {},
      styles: new Map(),
      images: new Map(),
    };
  }
  const documentXml = await docFile.async('string');

  const relsFile = zip.file('word/_rels/document.xml.rels');
  const relsXml = relsFile ? await relsFile.async('string') : '';
  const rels = parseRelationships(relsXml);

  const numberingFile = zip.file('word/numbering.xml');
  const numberingXml = numberingFile ? await numberingFile.async('string') : '';
  const numbering = parseNumberingXml(numberingXml);

  const coreFile = zip.file('docProps/core.xml');
  const coreXml = coreFile ? await coreFile.async('string') : '';
  const metadata = parseCoreMetadata(coreXml);

  const stylesFile = zip.file('word/styles.xml');
  const stylesXml = stylesFile ? await stylesFile.async('string') : '';
  const styles = parseStylesXml(stylesXml, opts.extractStyles);

  const images = new Map<string, string>();
  const nodes: DocumentNode[] = [];

  const orderedRoot = orderedParser.parse(documentXml) as unknown[];
  const bodyChildren = getBodyOrderedChildren(orderedRoot);

  await walkBody(
    bodyChildren,
    {
      zip,
      rels,
      styles,
      images,
      numbering,
      options: opts,
    },
    nodes,
  );

  return {
    nodes,
    metadata,
    styles,
    images,
  };
}
