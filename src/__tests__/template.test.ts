import { describe, it, expect } from 'vitest';
import { templateRegistry } from '@/lib/template/registry';

describe('TemplateRegistry', () => {
  it('should have 5 built-in templates', () => {
    const all = templateRegistry.getAllTemplates();
    expect(all.length).toBe(5);
    expect(all.every(t => t.isBuiltin)).toBe(true);
  });

  it('should find templates by ID', () => {
    const bidResponse = templateRegistry.getTemplate('bid-response');
    expect(bidResponse).toBeDefined();
    expect(bidResponse!.name).toBe('投标响应文件');
  });

  it('should find templates by document type', () => {
    const solution = templateRegistry.getByDocType('解决方案');
    expect(solution).toBeDefined();
    expect(solution!.id).toBe('solution');
  });

  it('should return undefined for unknown types', () => {
    expect(templateRegistry.getByDocType('自定义')).toBeUndefined();
    expect(templateRegistry.getTemplate('nonexistent')).toBeUndefined();
  });

  it('should convert template to outline sections', () => {
    const template = templateRegistry.getTemplate('bid-response')!;
    const outline = templateRegistry.templateToOutline(template);
    expect(outline.length).toBeGreaterThan(0);
    expect(outline[0].title).toBeTruthy();
    expect(outline[0].level).toBe(1);
  });

  it('should add custom templates', () => {
    templateRegistry.addCustomTemplate({
      id: 'custom-1',
      name: 'Custom Template',
      description: 'Test',
      isBuiltin: false,
      sections: [
        { title: 'Section 1', level: 1, description: 'Desc', children: [] },
      ],
    });
    expect(templateRegistry.getTemplate('custom-1')).toBeDefined();
    templateRegistry.removeTemplate('custom-1');
  });

  it('should not remove built-in templates', () => {
    const result = templateRegistry.removeTemplate('bid-response');
    expect(result).toBe(false);
    expect(templateRegistry.getTemplate('bid-response')).toBeDefined();
  });

  it('should have nested sections in templates', () => {
    const bidResponse = templateRegistry.getTemplate('bid-response')!;
    const techSection = bidResponse.sections.find(s => s.title === '技术方案');
    expect(techSection).toBeDefined();
    expect(techSection!.children.length).toBeGreaterThan(0);
  });

  it('all templates should have consistent structure', () => {
    for (const template of templateRegistry.getAllTemplates()) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.sections.length).toBeGreaterThan(0);
      for (const section of template.sections) {
        expect(section.title).toBeTruthy();
        expect(section.level).toBe(1);
      }
    }
  });
});
