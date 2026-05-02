# Contributing

This is a single-user product. Most changes go through the documented PRD process — read [`docs/MASTER_PRD.md`](docs/MASTER_PRD.md) **before** writing code, especially the red-lines in [`docs/Claude.md`](docs/Claude.md).

## Branch naming

```
feat/sprint-N-<short-name>   # new features tied to a Sprint in the PRD
fix/<short-name>             # bug fixes
chore/<short-name>           # tooling, deps, docs-only
docs/<short-name>            # documentation only
```

Never push directly to `main`. Always open a PR.

## Commit messages

`<type>(<scope>): <subject>` per the convention in [`docs/Claude.md`](docs/Claude.md):

- `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`
- Subject in present tense, imperative, no period.
- Body wrapped at 72 cols. Explain *why*, not *what*.

Example:
```
feat(architect): mandatory drawdown review gate

PRD §12 Sprint 6 requires drawdown integration before save —
confirm now blocks until /drawdown has been called for the
session's proposed allocation.
```

## TDD is non-negotiable

For every new service / function:

1. Write a failing test first.
2. Implement the minimum to make it pass.
3. Refactor with the green safety net.
4. Coverage on new code must be ≥80%.

Bug fixes start with a failing test that reproduces the bug.

## Required checks before PR

```bash
# Backend
cd backend
uv run ruff check .
uv run mypy --strict app/
uv run pytest tests/ -v --cov=app --cov-fail-under=80

# Frontend
cd ../frontend
npm run lint
npm run typecheck
npm run test -- --run
```

CI re-runs these on every PR — green status is required to merge.

## Pre-commit hooks

```bash
pip install pre-commit && pre-commit install
```

Hooks run ruff (lint + format), mypy, trailing-whitespace, end-of-file-fixer, YAML/JSON sanity, and block direct commits to `main`. They also block `console.log` and stray `print()` calls.

## Red lines (do not cross)

From `docs/Claude.md` — these are absolute:

1. No `expected_return` field anywhere. The system never predicts returns.
2. No automatic sell orders. Tax-Free Rebalancing only — buys via deposits.
3. No ETFs outside the curated universe.
4. No equity in Short-Term buckets.
5. No "AI Discovery" — AI explains, math decides.
6. No live tickers, no daily price colors.
7. No translated server text — `message_key` + `params` only; client translates.
8. No new top-level dependencies without updating `MASTER_PRD.md` first.
9. No `# type: ignore` / `as any` without a comment explaining the unsolvable underlying issue.
10. No DB inside the bundled app — always in the user's app-data dir.

When in doubt, ask before implementing. Don't assume.

## Decision Records

Architectural decisions go to [`docs/DECISIONS/ADR-XXX-<slug>.md`](docs/DECISIONS) — keep them short (Status / Context / Decision / Consequences / Alternatives Considered). Add the ADR in the same PR as the code change.

## Issue tracking

Use GitHub Issues for bug reports and feature proposals. Tag with the Sprint number from the PRD when applicable.
