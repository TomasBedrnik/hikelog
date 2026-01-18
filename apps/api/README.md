# HikeLog Backend

## Lint, format
Linting is forced in GitHub.
To run the linter, use the following command:

```bash
ruff check .
ruff check . --fix

ruff format --check .
ruff format .
```

## Local Development
```bash
cp apps/api/.env.example apps/api/.env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```