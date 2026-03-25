# DocForge

投标和提案文档，用 AI 写。

你手头有一份招标文件、需求说明，或者甲方发来的项目简介。你需要交出一份标书响应、解决方案、商业 Proposal，或者服务方案。

以前这件事要耗掉几天时间：通读需求、整理提纲、对照参考资料、一章一章地写。

DocForge 换了一种方式。把需求文档和你公司的参考资料上传进去，它自动分析、补全提纲、逐章节用 AI 生成内容，最后导出 Word 文档，你拿去改就行了。

[English](README_EN.md) · [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) · [![CI](https://github.com/yoligehude14753/docforge/actions/workflows/ci.yml/badge.svg)](https://github.com/yoligehude14753/docforge/actions/workflows/ci.yml)

<!-- demo screenshot -->
<!-- <img src="docs/demo.png" width="680" alt="DocForge 工作界面"> -->

## 功能

- **需求解析** — 自动读取招标文件，提炼核心要求，识别缺口
- **大纲生成** — 根据文档类型和需求自动生成标准章节结构，支持手动调整
- **RAG 检索增强** — 上传公司历史方案、产品资料作为参考，AI 写作时自动引用相关内容
- **逐章节生成** — 每个章节独立生成、独立审阅、独立重写，不影响其他章节
- **多 AI 提供商** — OpenAI、DeepSeek、Claude、Ollama（本地）均支持，切换自由
- **导出 Word** — 生成 `.docx` 格式，可直接在 Word/WPS 中二次编辑
- **本地优先** — 所有数据存在本机，不经过第三方服务器

## 支持的文档类型

| 类型 | 说明 |
|------|------|
| 标书响应文件 | 针对招标文件逐项响应 |
| 解决方案 | 技术或业务解决方案文档 |
| 项目说明书 | 项目背景、目标、实施计划 |
| 商业 Proposal | 面向客户的商业提案 |
| 服务方案 | 服务内容、交付物、报价说明 |
| 自定义 | 自由定义文档结构 |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) 18+（推荐用 [pnpm](https://pnpm.io/)）
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- [Tauri 开发环境](https://tauri.app/start/prerequisites/)（macOS / Windows / Linux 均支持）

### 本地运行

```bash
git clone https://github.com/yoligehude14753/docforge.git
cd docforge
pnpm install
pnpm tauri dev
```

### 配置 AI 提供商

启动后进入 **设置页面**，填入你的 API Key：

| 提供商 | 默认模型 | 需要 API Key |
|--------|---------|------------|
| OpenAI | gpt-4o | 是 |
| DeepSeek | deepseek-chat | 是 |
| Claude | claude-sonnet-4 | 是 |
| Ollama | qwen2.5:7b | 否（本地运行） |

### 基本工作流

1. **新建项目** — 选择文档类型，填写项目名称
2. **上传参考资料** — 上传公司历史方案、产品介绍等 PDF/Word 文件（可选但强烈建议）
3. **输入需求** — 粘贴或上传招标文件/需求说明
4. **分析** — DocForge 自动提炼需求、生成提纲
5. **生成** — 逐章节 AI 生成，可实时预览
6. **审阅 & 导出** — 修改满意后导出 `.docx`

## 技术架构

```
DocForge
├── 前端 (React 19 + TypeScript)
│   ├── 路由页面     home / project / generate / preview / settings
│   ├── 状态管理     Zustand（项目 / 设置 / 生成状态）
│   └── UI 组件      Tailwind CSS 4 + 自建组件库
├── 业务核心 (src/lib/)
│   ├── pipeline/    分析 → 缺口检测 → 生成 → 精修
│   ├── knowledge/   文档解析（PDF/DOCX）+ RAG（chunker / embedder / vector-store）
│   ├── ai/          多提供商统一接口（OpenAI / DeepSeek / Claude / Ollama）
│   ├── document/    Word 文档构建器（docx 库）
│   └── template/    文档模板注册表
└── 桌面壳 (Rust + Tauri 2)
    └── 文件系统访问 / 对话框 / 文件打开器
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（热重载）
pnpm tauri dev

# 运行测试（18 个测试模块）
pnpm test

# 构建发布包
pnpm tauri build
```

## 贡献

欢迎 PR 和 Issue！提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE) © 2026 yoligehude14753
