---
name: docforge
description: "AI-powered professional document generator. Use when the user wants to generate formal documents — bid responses, solution documents, proposals, service plans — from requirements or tender files, or needs help setting up, using, or extending DocForge."
---

# DocForge

Desktop app that turns any requirements document into a professional formal document using AI.

Supports: bid responses, solution documents, project descriptions, business proposals, service plans, and any custom document structure.

## When to use this skill

Use when the user:
- Wants to generate a formal document from a tender, RFP, requirements brief, or client description
- Is setting up DocForge for the first time (install, API key configuration)
- Wants to understand how the RAG knowledge pipeline works
- Needs to add a new document template, AI provider, or pipeline stage
- Is debugging a generation or document export issue

## User Workflow

DocForge works in six steps. Walk the user through these:

### 1. Download & Install
Direct the user to [Releases](https://github.com/yoligehude14753/docforge/releases) for the platform installer:
- macOS → `.dmg`
- Windows → `.msi` or `.exe`
- Linux → `.AppImage` or `.deb`

### 2. Configure AI Provider
On first launch, go to **Settings** and enter an API key:

| Provider | Model | Notes |
|----------|-------|-------|
| OpenAI | gpt-4o | Best quality |
| DeepSeek | deepseek-chat | Cost-effective |
| Claude | claude-sonnet-4 | Strong at long documents |
| Ollama | qwen2.5:7b | Fully local, no API key needed |

For Ollama: install from [ollama.com](https://ollama.com), run `ollama pull qwen2.5:7b`, set base URL to `http://localhost:11434`.

### 3. Create a Project
Click **New Project**, select a document type, give it a name.

Available document types:
- 标书响应文件 (Bid Response)
- 解决方案 (Solution Document)
- 项目说明书 (Project Description)
- 商业 Proposal (Business Proposal)
- 服务方案 (Service Plan)
- 自定义 (Custom — define your own structure)

### 4. Upload Reference Materials (Knowledge Base)
Upload past proposals, product specs, technical docs as PDF or Word files. DocForge builds a local RAG vector store from these — AI will cite relevant content when writing each section.

This step is optional but strongly recommended. Without references, the AI writes from general knowledge only.

### 5. Input Requirements
Paste the tender document, requirements spec, or client brief into the requirements field. DocForge will:
- Extract structured requirements with priority levels
- Identify information gaps
- Generate a section outline matching the document type

The outline is editable before generation starts.

### 6. Generate, Review, Export
- Click **Generate All** to write every section, or generate sections one at a time
- Each section streams in real-time; click **Regenerate** with feedback to rewrite
- When satisfied, click **Export** to download a `.docx` file

## Development Setup

For users who want to build from source or contribute:

```bash
# Prerequisites: Node.js 18+, pnpm, Rust 1.77+
# See: https://tauri.app/start/prerequisites/

git clone https://github.com/yoligehude14753/docforge.git
cd docforge
pnpm install
pnpm tauri dev       # dev mode with hot reload
pnpm test            # run 18 test modules
pnpm tauri build     # build release installer
```

## Extending DocForge

### Add a new document template

Create a JSON file in `templates/` and register it in `src/lib/template/registry.ts`:

```json
{
  "docType": "My Document Type",
  "sections": [
    { "title": "Executive Summary", "level": 1, "description": "Overview", "children": [] },
    { "title": "Technical Approach", "level": 1, "description": "Solution details", "children": [
      { "title": "Architecture", "level": 2, "description": "System design", "children": [] }
    ]}
  ]
}
```

### Add a new AI provider

In `src/lib/ai/provider.ts`:
1. Add the provider name to the `AIConfig.provider` union type
2. Add default config to `DEFAULT_CONFIGS`
3. Implement `myProviderCompletion()` and `myProviderStream()` following the existing pattern
4. Add cases in `chatCompletion()` and `streamChatCompletion()`

### Key internals

```typescript
// Analyze requirements and build outline
import { analyzeRequirements } from '@/lib/pipeline/analyzer';
const result = await analyzeRequirements(text, docType, aiConfig);
// → { requirements[], outline[], documentType, suggestedTitle }

// Generate one section with RAG context
import { generateSection } from '@/lib/pipeline/generator';
const content = await generateSection(context, aiConfig, { onToken: (t) => process.stdout.write(t) });

// Search the local vector store
import { VectorStore } from '@/lib/knowledge/rag/vector-store';
const store = new VectorStore();
store.add(id, text, metadata);
const hits = store.search(query, topK = 5);  // TF-IDF cosine similarity
```

## Architecture

```
src/lib/
├── ai/provider.ts        Unified multi-provider interface (OpenAI / DeepSeek / Claude / Ollama)
├── pipeline/
│   ├── analyzer.ts       Requirements extraction + outline generation
│   ├── gap-detector.ts   Identify missing info before generation
│   ├── generator.ts      Per-section generation with RAG context
│   └── refiner.ts        Post-generation refinement
├── knowledge/
│   ├── parser/           PDF + DOCX → structured document trees
│   ├── rag/              Chunker, TF-IDF embedder, vector store, retriever
│   └── matcher.ts        Match requirements to knowledge chunks
├── document/builder.ts   Assemble .docx output
└── template/registry.ts  Document type → section structure map
```

## References

- [README (中文)](https://github.com/yoligehude14753/docforge/blob/main/README.md)
- [README (English)](https://github.com/yoligehude14753/docforge/blob/main/README_EN.md)
- [Contributing Guide](https://github.com/yoligehude14753/docforge/blob/main/CONTRIBUTING.md)
- [Releases](https://github.com/yoligehude14753/docforge/releases)
- [Tauri 2 Docs](https://tauri.app/start/)
