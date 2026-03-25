# Contributing to DocForge

Thanks for your interest in contributing!

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+, [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Clone & install

```bash
git clone https://github.com/yoligehude14753/docforge.git
cd docforge
pnpm install
```

### Run in dev mode

```bash
pnpm tauri dev
```

### Run tests

```bash
pnpm test
```

## Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Run type check: `pnpm build` (catches TypeScript errors)
6. Commit with a clear message
7. Push and open a Pull Request

## Code Style

- TypeScript — follow the existing strict-mode conventions; avoid `any`
- Rust — run `cargo fmt` and `cargo clippy` before committing
- Keep PRs focused — one feature or fix per PR
- Add tests for new pipeline or knowledge logic

## Project Structure

```
src/lib/
├── ai/          AI provider abstraction (add new providers here)
├── pipeline/    Document generation pipeline stages
├── knowledge/   Document parsing and RAG
├── document/    Word export
└── template/    Document type templates (add new doc types here)
```

## Reporting Issues

- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml) for bugs
- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml) for ideas
- Search existing issues before opening a new one

## Questions?

Open a Discussion or Issue — happy to help.
