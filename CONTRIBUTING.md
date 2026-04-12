# Contributing

## Workflow

1. Create a branch from `main`.
2. Keep refactors non-destructive unless behavior changes are explicitly requested.
3. Update tests and documentation for any structural change.
4. Open a pull request with a concise summary, test results, and any migration notes.

## Local Checks

```bash
python -m pytest apps/api/tests -o cache_dir=apps/api/.pytest_cache
python -m compileall apps/api/src apps/api/tests
```

```bash
cd apps/web
npm run test
npm run test:e2e
```
