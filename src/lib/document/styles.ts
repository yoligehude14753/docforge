export const FONT_FAMILIES = {
  heading: '黑体',
  body: '宋体',
  english: 'Times New Roman',
} as const;

export const FONT_SIZES = {
  title: 44, // 小二 (half-points)
  heading1: 44, // 小二
  heading2: 32, // 三号
  heading3: 28, // 小三
  heading4: 24, // 四号
  body: 24, // 小四
  caption: 18, // 小五
} as const;

export const COLORS = {
  primary: '1a1a2e',
  secondary: '16213e',
  accent: '0f3460',
  text: '333333',
  lightText: '666666',
  border: 'cccccc',
} as const;

export const PAGE = {
  width: 11906, // A4 width in twips (210mm)
  height: 16838, // A4 height in twips (297mm)
  marginTop: 1440, // 2.54cm
  marginBottom: 1440,
  marginLeft: 1800, // 3.17cm
  marginRight: 1800,
} as const;
