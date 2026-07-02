# Contributing Guide

## Branching

- Use feature branches from `main`
- Open pull requests with context and verification output

## Quality Gates

Before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run build
```

## Commit Format

Use conventional commits:

- `feat: add assignment timeline endpoint`
- `fix: harden token validation`
