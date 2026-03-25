# DocForge

**Takes the grunt work out of writing bids, proposals, and solution documents.**

The hardest part of document writing isn't the writing itself — it's reading through requirements, untangling the structure, cross-referencing materials, and iterating on the outline. DocForge handles that part. Upload your requirements and reference documents, and it analyzes the brief, builds a structured outline, and drafts each section with AI. You focus on review and final edits.

Use cases: **bid responses · solution documents · project descriptions · business proposals · service plans** — any work that involves turning a pile of requirements into a formal document.

[中文文档](README.md) · [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) · [![CI](https://github.com/yoligehude14753/docforge/actions/workflows/ci.yml/badge.svg)](https://github.com/yoligehude14753/docforge/actions/workflows/ci.yml)

<!-- demo screenshot -->
<!-- <img src="docs/demo.png" width="720" alt="DocForge interface"> -->

---

## Download

> **macOS / Windows / Linux installers** are available on the [Releases](https://github.com/yoligehude14753/docforge/releases) page.

| Platform | Format |
|----------|--------|
| macOS | `.dmg` |
| Windows | `.msi` / `.exe` |
| Linux | `.AppImage` / `.deb` |

> To build from source, see [Development](#development).

---

## Core Features

### Intelligent Requirements Parsing
Paste or upload a tender document or requirements spec. DocForge extracts structured requirements, assigns priority levels, identifies information gaps, and generates a section outline — no manual cleanup needed.

### Knowledge-Based Writing (RAG)
Upload your company's past proposals, product white papers, and technical specs (PDF / Word). Every section is generated with the most relevant passages from your knowledge base retrieved automatically, so AI output is grounded in your actual materials — not hallucinated.

### Per-Section Generation and Review
Each section in the outline can be generated, rewritten, or given feedback independently. Changing section 3 doesn't touch section 1; approved sections stay untouched.

### Multiple AI Providers

| Provider | Recommended model | API key required |
|----------|------------------|-----------------|
| OpenAI | gpt-4o | Yes |
| DeepSeek | deepseek-chat | Yes (cost-effective) |
| Claude | claude-sonnet-4 | Yes |
| Ollama | qwen2.5:7b etc. | No (fully local) |

### Standard Word Export
Output is a `.docx` file that opens directly in Word or WPS with no format loss.

### Local-First, Data Stays On Your Machine
All project data and uploaded files are stored locally. The only outbound requests go to the AI provider API you configure — no DocForge server, no data upload.

---

## Workflow

```
1. New project       Choose document type, give it a name
        ↓
2. Upload references  Past proposals, product docs, specs (PDF / Word) — builds knowledge base
        ↓
3. Input requirements Paste or upload the tender / requirements document
        ↓
4. Auto-analyze       DocForge extracts requirements, detects gaps, builds section outline
        ↓
5. Generate           AI writes each section with streaming preview; regenerate with feedback
        ↓
6. Review & export    Export to .docx when satisfied
```

---

## Document Types

| Type | Typical use case |
|------|-----------------|
| Bid Response | Point-by-point response to an RFP |
| Solution Document | Technical or business solution write-up |
| Project Description | Background, objectives, implementation plan |
| Business Proposal | Client-facing commercial proposal |
| Service Plan | Service scope, deliverables, pricing overview |
| Custom | Define your own outline structure |

---

## Development

### Requirements

- [Node.js](https://nodejs.org/) 18+, [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- [Tauri system dependencies](https://tauri.app/start/prerequisites/) (macOS / Windows / Linux)

### Run locally

```bash
git clone https://github.com/yoligehude14753/docforge.git
cd docforge
pnpm install
pnpm tauri dev
```

### Common commands

```bash
pnpm test          # run tests (18 modules)
pnpm tauri build   # build release installer
```

### Architecture

```
DocForge
├── Frontend (React 19 + TypeScript + Vite)
│   ├── Routes       home / project / generate / preview / settings
│   ├── State        Zustand
│   └── UI           Tailwind CSS 4
├── Core logic (src/lib/)
│   ├── pipeline/    analyze → gap-detect → generate → refine
│   ├── knowledge/   document parsing (PDF/DOCX) + RAG (chunker / embedder / vector-store)
│   ├── ai/          unified multi-provider interface
│   ├── document/    Word document builder
│   └── template/    document template registry
└── Desktop shell (Rust + Tauri 2)
    └── filesystem / dialogs / file opener
```

---

## Contributing

PRs and issues welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting.

## License

[MIT](LICENSE) © 2026 yoligehude14753
