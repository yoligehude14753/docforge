import type { OutlineSection } from '@/lib/pipeline/analyzer';

export interface Template {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
  isBuiltin: boolean;
}

export interface TemplateSection {
  title: string;
  level: number;
  description: string;
  children: TemplateSection[];
}

// Map document type names to template IDs
const TYPE_TO_TEMPLATE: Record<string, string> = {
  标书响应文件: 'bid-response',
  解决方案: 'solution',
  项目说明书: 'project-description',
  商业Proposal: 'proposal',
  服务方案: 'service-plan',
};

class TemplateRegistry {
  private templates: Map<string, Template> = new Map();

  constructor() {
    this.loadBuiltinTemplates();
  }

  private loadBuiltinTemplates() {
    // Hard-code the built-in templates inline since we can't do dynamic imports easily in the browser
    // Import them from the JSON files
    const builtins: Template[] = [
      // bid-response template
      {
        id: 'bid-response',
        name: '投标响应文件',
        description: '标准投标技术标响应文件，适用于政府采购和企业招标',
        isBuiltin: true,
        sections: [
          { title: '投标函', level: 1, description: '正式投标函件', children: [] },
          {
            title: '公司概况',
            level: 1,
            description: '投标单位基本情况',
            children: [
              { title: '公司简介', level: 2, description: '基本信息', children: [] },
              { title: '组织架构', level: 2, description: '组织结构', children: [] },
              { title: '资质荣誉', level: 2, description: '资质证书', children: [] },
            ],
          },
          {
            title: '技术方案',
            level: 1,
            description: '技术解决方案',
            children: [
              { title: '需求理解', level: 2, description: '需求分析', children: [] },
              { title: '总体设计', level: 2, description: '架构设计', children: [] },
              { title: '详细设计', level: 2, description: '功能模块设计', children: [] },
              { title: '技术优势', level: 2, description: '技术亮点', children: [] },
            ],
          },
          {
            title: '项目实施方案',
            level: 1,
            description: '实施计划',
            children: [
              { title: '实施计划', level: 2, description: '时间安排', children: [] },
              { title: '项目团队', level: 2, description: '人员配置', children: [] },
              { title: '质量保证', level: 2, description: '质量管理', children: [] },
            ],
          },
          {
            title: '售后服务方案',
            level: 1,
            description: '售后保障',
            children: [
              { title: '服务体系', level: 2, description: '服务组织', children: [] },
              { title: '培训方案', level: 2, description: '培训计划', children: [] },
              { title: '应急预案', level: 2, description: '应急保障', children: [] },
            ],
          },
        ],
      },
      // solution template
      {
        id: 'solution',
        name: '解决方案',
        description: '技术解决方案文档',
        isBuiltin: true,
        sections: [
          {
            title: '项目背景',
            level: 1,
            description: '背景和现状',
            children: [
              { title: '行业背景', level: 2, description: '行业趋势', children: [] },
              { title: '现状分析', level: 2, description: '问题痛点', children: [] },
              { title: '建设目标', level: 2, description: '项目目标', children: [] },
            ],
          },
          {
            title: '解决方案概述',
            level: 1,
            description: '方案介绍',
            children: [
              { title: '方案理念', level: 2, description: '设计理念', children: [] },
              { title: '总体架构', level: 2, description: '架构设计', children: [] },
              { title: '技术路线', level: 2, description: '技术选型', children: [] },
            ],
          },
          {
            title: '功能详细设计',
            level: 1,
            description: '功能说明',
            children: [
              { title: '核心功能', level: 2, description: '核心业务', children: [] },
              { title: '扩展功能', level: 2, description: '增值功能', children: [] },
              { title: '集成接口', level: 2, description: '接口设计', children: [] },
            ],
          },
          {
            title: '实施规划',
            level: 1,
            description: '实施方案',
            children: [
              { title: '实施步骤', level: 2, description: '分阶段计划', children: [] },
              { title: '资源配置', level: 2, description: '资源需求', children: [] },
              { title: '风险管控', level: 2, description: '风险应对', children: [] },
            ],
          },
          { title: '项目价值', level: 1, description: '价值分析', children: [] },
        ],
      },
      // proposal template
      {
        id: 'proposal',
        name: '商业Proposal',
        description: '商业提案文档',
        isBuiltin: true,
        sections: [
          { title: 'Executive Summary', level: 1, description: '提案摘要', children: [] },
          {
            title: '需求分析',
            level: 1,
            description: '需求分析',
            children: [
              { title: '业务挑战', level: 2, description: '核心挑战', children: [] },
              { title: '目标愿景', level: 2, description: '业务目标', children: [] },
            ],
          },
          {
            title: '方案建议',
            level: 1,
            description: '方案建议',
            children: [
              { title: '方案概述', level: 2, description: '方案核心', children: [] },
              { title: '方案特色', level: 2, description: '差异化优势', children: [] },
              { title: '成功案例', level: 2, description: '成功经验', children: [] },
            ],
          },
          {
            title: '投资回报',
            level: 1,
            description: '投资分析',
            children: [
              { title: '预算概览', level: 2, description: '费用明细', children: [] },
              { title: 'ROI 分析', level: 2, description: '回报预期', children: [] },
            ],
          },
          {
            title: '合作方案',
            level: 1,
            description: '合作模式',
            children: [
              { title: '合作模式', level: 2, description: '合作方式', children: [] },
              { title: '行动计划', level: 2, description: '推进步骤', children: [] },
            ],
          },
        ],
      },
      // project-description
      {
        id: 'project-description',
        name: '项目说明书',
        description: '项目说明文档',
        isBuiltin: true,
        sections: [
          {
            title: '项目概述',
            level: 1,
            description: '整体介绍',
            children: [
              { title: '项目背景', level: 2, description: '背景原因', children: [] },
              { title: '项目目标', level: 2, description: '主要目标', children: [] },
              { title: '项目范围', level: 2, description: '范围边界', children: [] },
            ],
          },
          {
            title: '技术方案',
            level: 1,
            description: '技术实现',
            children: [
              { title: '架构设计', level: 2, description: '系统架构', children: [] },
              { title: '功能规格', level: 2, description: '功能需求', children: [] },
              { title: '技术选型', level: 2, description: '技术栈', children: [] },
            ],
          },
          {
            title: '项目计划',
            level: 1,
            description: '实施计划',
            children: [
              { title: '阶段规划', level: 2, description: '阶段安排', children: [] },
              { title: '人员组织', level: 2, description: '团队组织', children: [] },
              { title: '里程碑', level: 2, description: '关键节点', children: [] },
            ],
          },
          { title: '预算与资源', level: 1, description: '预算资源', children: [] },
          { title: '风险评估', level: 1, description: '风险应对', children: [] },
        ],
      },
      // service-plan
      {
        id: 'service-plan',
        name: '服务方案',
        description: '服务方案文档',
        isBuiltin: true,
        sections: [
          {
            title: '服务概述',
            level: 1,
            description: '整体介绍',
            children: [
              { title: '服务背景', level: 2, description: '项目背景', children: [] },
              { title: '服务目标', level: 2, description: '服务目标', children: [] },
              { title: '服务范围', level: 2, description: '范围边界', children: [] },
            ],
          },
          {
            title: '服务内容',
            level: 1,
            description: '详细内容',
            children: [
              { title: '基础服务', level: 2, description: '标准服务', children: [] },
              { title: '增值服务', level: 2, description: '附加服务', children: [] },
              { title: '定制服务', level: 2, description: '定制内容', children: [] },
            ],
          },
          {
            title: '服务保障',
            level: 1,
            description: '保障体系',
            children: [
              { title: '服务团队', level: 2, description: '团队配置', children: [] },
              { title: '质量体系', level: 2, description: '质量管理', children: [] },
              { title: 'SLA 承诺', level: 2, description: '服务承诺', children: [] },
            ],
          },
          {
            title: '实施方案',
            level: 1,
            description: '实施计划',
            children: [
              { title: '实施流程', level: 2, description: '交付流程', children: [] },
              { title: '时间安排', level: 2, description: '时间表', children: [] },
            ],
          },
          { title: '服务案例', level: 1, description: '案例评价', children: [] },
        ],
      },
    ];

    for (const t of builtins) {
      this.templates.set(t.id, t);
    }
  }

  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  getByDocType(docType: string): Template | undefined {
    const tid = TYPE_TO_TEMPLATE[docType];
    return tid ? this.templates.get(tid) : undefined;
  }

  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  addCustomTemplate(template: Template): void {
    this.templates.set(template.id, { ...template, isBuiltin: false });
  }

  removeTemplate(id: string): boolean {
    const t = this.templates.get(id);
    if (t?.isBuiltin) return false;
    return this.templates.delete(id);
  }

  templateToOutline(template: Template): OutlineSection[] {
    function convert(sections: TemplateSection[]): OutlineSection[] {
      return sections.map((s) => ({
        title: s.title,
        level: s.level,
        description: s.description,
        children: convert(s.children),
      }));
    }
    return convert(template.sections);
  }
}

export const templateRegistry = new TemplateRegistry();
