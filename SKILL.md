---
name: docforge
description: "Generate professional bid documents, proposals, and solution documents using AI. Use when the user wants to create bid responses, solution documents, business proposals, or service plans from tender requirements and reference materials."
---

# DocForge

AI-powered bid and proposal document generator — desktop app built with Tauri 2 + React + TypeScript.

## When to use this skill

Use when the user:
- Wants to generate a bid response, solution document, business proposal, or service plan
- Has a tender document or requirements brief and needs to produce a formal response
- Wants to set up, configure, or extend DocForge
- Needs help adding a new AI provider, document template, or pipeline stage
- Wants to understand the RAG knowledge pipeline or document generation flow

## What this skill provides

DocForge processes tender documents through a four-stage pipeline: requirements analysis → gap detection → per-section AI generation → refinement. It uses a local TF-IDF vector store to retrieve relevant passages from uploaded reference documents (RAG), then generates each section with the appropriate AI provider. Output is a structured `.docx` file.

## Architecture Overview

```
src/lib/
├── ai/provider.ts          Unified interface for OpenAI / DeepSeek / Claude / Ollama
├── pipeline/
│   ├── analyzer.ts         Extract requirements and outline from tender text
│   ├── gap-detector.ts     Identify missing information before generation
│   ├── generator.ts        Per-section content generation with RAG context
│   └── refiner.ts          Post-generation refinement pass
├── knowledge/
│   ├── parser/             PDF and DOCX parsing into structured trees
│   ├── rag/                Chunker, embedder (TF-IDF), vector store, retriever
│   └── matcher.ts          Match requirements to knowledge chunks
├── document/builder.ts     Assemble final Word document via docx library
└── template/registry.ts    Document type → section structure mapping
```

## Instructions

### Step 1: Set up the development environment

Prerequisites: Node.js 18+, pnpm, Rust 1.77+, Tauri prerequisites.

```bash
git clone https://github.com/yoligehude14753/docforge.git
cd docforge
pnpm install
pnpm tauri dev
```

### Step 2: Configure an AI provider

Open Settings in the app and enter your API key. Supported providers:

```typescript
// src/lib/ai/provider.ts
export const DEFAULT_CONFIGS: Record<string, Partial<AIConfig>> = {
  openai:   { baseUrl: 'https://api.openai.com/v1',    model: 'gpt-4o' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1',  model: 'deepseek-chat' },
  claude:   { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  ollama:   { baseUrl: 'http://localhost:11434',        model: 'qwen2.5:7b' },
};
```

To add a new provider, extend the `AIProvider` union type and implement the completion and streaming functions following the existing pattern.

### Step 3: Add a new document template

Templates define the default section structure for a document type. Add a JSON file to `templates/` and register it in `src/lib/template/registry.ts`:

```typescript
// templates/my-template.json
{
  "docType": "My Document Type",
  "sections": [
    { "title": "Executive Summary", "level": 1, "children": [] },
    { "title": "Technical Approach", "level": 1, "children": [
      { "title": "Architecture", "level": 2, "children": [] }
    ]}
  ]
}
```

### Step 4: Extend the generation pipeline

The pipeline stages are independent functions. To add a new stage:

1. Create `src/lib/pipeline/my-stage.ts` with a pure async function
2. Call it from `src/app/routes/generate/index.tsx` at the appropriate point
3. Add corresponding tests in `src/__tests__/my-stage.test.ts`

### Step 5: Run tests

```bash
pnpm test          # run all 18 test modules once
pnpm test:watch    # watch mode
```

Test files mirror the source structure under `src/__tests__/`.

## Document Generation Workflow

```
User uploads tender doc + reference files
        ↓
analyzeRequirements()   → extracts requirements[], outline[]
        ↓
detectGaps()            → identifies missing info
        ↓
For each outline section:
  retrieveContext()     → RAG search in vector store
  generateSection()     → AI writes section with context
        ↓
buildDocument()         → assembles .docx with styles
        ↓
User downloads .docx
```

## Key API

```typescript
// Analyze a tender document
import { analyzeRequirements } from '@/lib/pipeline/analyzer';
const result = await analyzeRequirements(requirementText, documentType, aiConfig);
// result: { requirements[], outline[], documentType, suggestedTitle }

// Generate a section
import { generateSection } from '@/lib/pipeline/generator';
const content = await generateSection(context, aiConfig, { onToken: (t) => console.log(t) });

// Search the vector store
import { VectorStore } from '@/lib/knowledge/rag/vector-store';
const store = new VectorStore();
store.add(id, text, metadata);
const results = store.search(query, topK = 5);
```

## References

- [README (中文)](https://github.com/yoligehude14753/docforge/blob/main/README.md)
- [README (English)](https://github.com/yoligehude14753/docforge/blob/main/README_EN.md)
- [Contributing Guide](https://github.com/yoligehude14753/docforge/blob/main/CONTRIBUTING.md)
- [Tauri 2 Documentation](https://tauri.app/start/)
