# DocForge

**让写标书、写方案、写 Proposal 不再是一件苦差事。**

文档撰写最耗人的不是写作本身，而是通读需求、梳理逻辑、对照资料、反复调整结构这些前置工作。DocForge 把这部分接过来——上传你的需求文件和公司参考资料，它自动解析需求、生成大纲、调用 AI 逐章节起草内容，你只需要审阅和收尾。

适用场景：**标书响应 · 解决方案 · 项目说明书 · 商业 Proposal · 服务方案** 以及任何需要把一堆要求整理成一份正式文档的工作。

[English](README_EN.md) · [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) · [![CI](https://github.com/yoligehude14753/docforge/actions/workflows/ci.yml/badge.svg)](https://github.com/yoligehude14753/docforge/actions/workflows/ci.yml)

<!-- demo screenshot -->
<!-- <img src="docs/demo.png" width="720" alt="DocForge 工作界面"> -->

---

## 下载

> **macOS / Windows / Linux 安装包**在 [Releases](https://github.com/yoligehude14753/docforge/releases) 页面下载。

下载对应平台的安装包，双击安装，打开后在**设置页**填入你的 AI API Key 即可使用。

| 平台 | 文件格式 |
|------|--------|
| macOS | `.dmg` |
| Windows | `.msi` / `.exe` |
| Linux | `.AppImage` / `.deb` |

> 如需从源码构建，见 [开发](#开发) 一节。

---

## 核心能力

### 智能需求解析
将招标文件或需求说明粘贴/上传进来，DocForge 自动提炼出结构化的需求条目、分配优先级、识别信息缺口，并生成对应大纲——不需要你手动整理。

### 知识库驱动写作（RAG）
上传你公司的历史方案、产品白皮书、技术规格等参考文档（PDF / Word）。每一章节生成时，DocForge 自动从知识库中检索最相关的段落，让 AI 写出来的内容真正基于你的实际资料，而不是凭空捏造。

### 逐章节独立生成与审阅
大纲里的每个章节可以单独生成、单独重写、单独提供反馈。改了第三章不会影响第一章，已经审阅通过的内容不会被覆盖。

### 多 AI 提供商，自由切换
| 提供商 | 推荐模型 | 需要 API Key |
|--------|---------|------------|
| OpenAI | gpt-5.4 | 是 |
| DeepSeek | deepseek-chat | 是 |
| Claude | claude-sonnet-4 | 是 |
| Ollama | qwen2.5:7b 等 | 否 |

### 导出标准 Word 文档
生成结果导出为 `.docx` 格式，在 Word / WPS 中直接打开编辑，无格式损失。

### 本地优先，数据不出境
所有项目数据和上传文件都存储在你的本机。唯一的出站请求是你配置的 AI API 接口——没有 DocForge 服务器，没有数据上传。

---

## 使用流程

```
1. 新建项目          选择文档类型（标书 / 解决方案 / Proposal ...），填写项目名称
         ↓
2. 上传参考资料      公司历史方案、产品介绍、技术文档（PDF / Word），构建知识库
         ↓
3. 输入需求          粘贴招标文件 / 需求说明，或直接上传文档
         ↓
4. 自动分析          DocForge 提炼需求条目、识别缺口、生成章节大纲
         ↓
5. AI 逐章节生成     每章节实时流式输出，可随时暂停、重写、提供反馈
         ↓
6. 审阅 & 导出       确认内容后一键导出 .docx
```

---

## 支持的文档类型

| 类型 | 典型使用场景 |
|------|------------|
| 标书响应文件 | 针对招标文件逐项响应 |
| 解决方案 | 技术或业务解决方案文档 |
| 项目说明书 | 项目背景、目标、实施计划 |
| 商业 Proposal | 面向客户的商业提案 |
| 服务方案 | 服务内容、交付物、报价说明 |
| 自定义 | 自定义大纲结构，适配任何文档类型 |

---

## 开发

### 环境要求

- [Node.js](https://nodejs.org/) 18+，推荐使用 [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- [Tauri 系统依赖](https://tauri.app/start/prerequisites/)（macOS / Windows / Linux 均支持）

### 本地运行

```bash
git clone https://github.com/yoligehude14753/docforge.git
cd docforge
pnpm install
pnpm tauri dev
```

### 常用命令

```bash
pnpm test          # 运行测试（18 个测试模块）
pnpm tauri build   # 构建发布安装包
```

### 技术架构

```
DocForge
├── 前端 (React 19 + TypeScript + Vite)
│   ├── 路由页面     home / project / generate / preview / settings
│   ├── 状态管理     Zustand
│   └── UI           Tailwind CSS 4
├── 业务核心 (src/lib/)
│   ├── pipeline/    分析 → 缺口检测 → 生成 → 精修
│   ├── knowledge/   文档解析（PDF/DOCX）+ RAG（chunker / embedder / vector-store）
│   ├── ai/          多提供商统一接口
│   ├── document/    Word 文档构建器
│   └── template/    文档模板注册表
└── 桌面壳 (Rust + Tauri 2)
    └── 文件系统 / 对话框 / 文件打开器
```

---

## 贡献

欢迎 PR 和 Issue！提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE) © 2026 yoligehude14753
