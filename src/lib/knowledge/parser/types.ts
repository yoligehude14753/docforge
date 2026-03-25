export interface DocumentNode {
  type: 'heading' | 'paragraph' | 'list-item' | 'table' | 'image' | 'page-break';
  level?: number;
  content: string;
  style?: StyleInfo;
  children?: DocumentNode[];
  imageData?: string;
  imageName?: string;
  metadata?: Record<string, string>;
}

export interface StyleInfo {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  styleName?: string;
}

export interface DocumentTree {
  nodes: DocumentNode[];
  metadata: {
    title?: string;
    author?: string;
    created?: string;
    modified?: string;
  };
  styles: Map<string, StyleInfo>;
  images: Map<string, string>;
}

export interface ParseOptions {
  extractImages?: boolean;
  extractStyles?: boolean;
  maxImageSize?: number;
}
