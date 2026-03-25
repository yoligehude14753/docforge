# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public issue
2. Use [GitHub Security Advisories](https://github.com/yoligehude14753/docforge/security/advisories/new) to report privately
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: within 48 hours
- **Initial assessment**: within 1 week
- **Fix or mitigation**: depends on severity

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| < Latest | Best effort |

## Scope

This policy covers the DocForge codebase. Third-party dependencies are out of scope but will be reported upstream if discovered.

## Notes on Data Privacy

DocForge is a local-first desktop application. All project data and uploaded documents are stored on your machine. The only outbound network requests are to the AI provider API you configure (OpenAI, DeepSeek, Claude, or your local Ollama instance). No data is sent to DocForge servers.
