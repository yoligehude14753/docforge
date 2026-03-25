# DocForge

AI-powered bid and proposal document generator.

You have an RFP, a requirements doc, or a brief from a client. You need to produce a bid response, a solution document, a business proposal, or a service plan.

The old way takes days: read through the requirements, outline the structure, cross-reference your reference material, write section by section.

DocForge does it differently. Upload your requirements and reference documents, and it automatically analyzes the tender, builds the outline, generates each section with AI using your own material as context, and exports a Word document ready for final edits.

[中文文档](README.md) · [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) · [![CI](https://github.com/yoligehude14753/docforge/actions/workflows/ci.yml/badge.svg)](https://github.com/yoligehude14753/docforge/actions/workflows/ci.yml)

<!-- demo screenshot -->
<!-- <img src="docs/demo.png" width="680" alt="DocForge interface"> -->

## Features

- **Requirements analysis** — reads tender documents, extracts key requirements, identifies gaps
- **Outline generation** — produces a standard section structure based on document type and requirements; fully editable
- **RAG-enhanced writing** — upload your company's past proposals and product specs as references; AI cites relevant content when writing each section
- **Per-section generation** — each section is generated, reviewed, and rewritten independently
- **Multiple AI providers** — OpenAI, DeepSeek, Claude, Ollama (local); switch freely
- **Word export** — generates `.docx` files ready to open in Word or WPS
- **Local-first** — all data stays on your machine; no third-party server involved

## Document Types

| Type | Description |
|------|-------------|
| Bid Response | Point-by-point response to an RFP |
| Solution Document | Technical or business solution write-up |
| Project Description | Background, objectives, implementation plan |
| Business Proposal | Client-facing commercial proposal |
| Service Plan | Service scope, deliverables, pricing overview |
| Custom | Define your own document structure |

## Quick Start

### Requirements

- [Node.js](https://nodejs.org/) 18+ (recommended: [pnpm](https://pnpm.io/))
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) (macOS / Windows / Linux)

### Run locally

```bash
git clone https://github.com/yoligehude14753/docforge.git
cd docforge
pnpm install
pnpm tauri dev
```

### Configure an AI provider

Open the **Settings** page and enter your API key:

| Provider | Default model | API key required |
|----------|--------------|-----------------|
| OpenAI | gpt-4o | Yes |
| DeepSeek | deepseek-chat | Yes |
| Claude | claude-sonnet-4 | Yes |
| Ollama | qwen2.5:7b | No (runs locally) |

### Workflow

1. **New project** — choose a document type and give it a name
2. **Upload references** — add past proposals, product sheets, or specs as PDF/Word (optional but recommended)
3. **Input requirements** — paste or upload the tender document or brief
4. **Analyze** — DocForge extracts requirements and builds an outline
5. **Generate** — AI writes each section with real-time streaming preview
6. **Review & export** — edit to satisfaction, then export `.docx`

## Architecture

```
DocForge
├── Frontend (React 19 + TypeScript)
│   ├── Routes       home / project / generate / preview / settings
│   ├── State        Zustand (project / settings / generation state)
│   └── UI           Tailwind CSS 4 + custom component library
├── Core logic (src/lib/)
│   ├── pipeline/    analyze → gap-detect → generate → refine
│   ├── knowledge/   document parsing (PDF/DOCX) + RAG (chunker / embedder / vector-store)
│   ├── ai/          unified multi-provider interface (OpenAI / DeepSeek / Claude / Ollama)
│   ├── document/    Word document builder (docx library)
│   └── template/    document template registry
└── Desktop shell (Rust + Tauri 2)
    └── filesystem access / dialogs / file opener
```

## Development

```bash
# Install dependencies
pnpm install

# Dev mode with hot reload
pnpm tauri dev

# Run tests (18 test modules)
pnpm test

# Build release bundle
pnpm tauri build
```

## Contributing

PRs and issues welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting.

## License

[MIT](LICENSE) © 2026 yoligehude14753
